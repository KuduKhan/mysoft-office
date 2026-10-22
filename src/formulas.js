// Small, safe, dependency-free formula evaluator. Never evaluates JavaScript.
export const COLUMNS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
export const ROW_COUNT = 1000;

export function columnIndex(name) {
  let value = 0;
  for (const char of name) value = value * 26 + char.charCodeAt(0) - 64;
  return value - 1;
}

export function cellRange(from, to) {
  const ref = /^([A-Z]+)([1-9][0-9]*)$/;
  const left = ref.exec(from);
  const right = ref.exec(to);
  if (!left || !right) throw Error('Invalid range');
  const [a, b] = [columnIndex(left[1]), columnIndex(right[1])].sort((x,y)=>x-y);
  const [c, d] = [Number(left[2]), Number(right[2])].sort((x,y)=>x-y);
  if(a<0||b>=26||c<1||d>ROW_COUNT)throw Error('Range outside supported grid');
  if ((b-a+1)*(d-c+1) > 10000) throw Error('Range too large');
  const names = [];
  for (let row=c; row<=d; row++) {
    for (let col=a; col<=b; col++) {
      let n = col+1, label='';
      while (n) { n--; label = String.fromCharCode(65+n%26)+label; n=Math.floor(n/26); }
      names.push(label+row);
    }
  }
  return names;
}

function scan(source) {
  const tokens=[];
  const regex=/\s*(>=|<=|<>|[A-Z]+[1-9][0-9]*|[A-Z]+|(?:\d+(?:\.\d*)?|\.\d+)|[()+\-*/:,<>=])/gy;
  let index=0;
  while (index<source.length) {
    regex.lastIndex=index;
    const match=regex.exec(source);
    if(!match) throw Error('Invalid expression');
    tokens.push(match[1]);
    index=regex.lastIndex;
  }
  return tokens;
}

export function evaluateCell(reference, cells, stack = new Set()) {
  const key=String(reference).toUpperCase();
  if(stack.has(key)) return '#CYCLE!';
  const raw=String(cells[key] ?? '');
  if(!raw.startsWith('=')) return raw;
  const next=new Set(stack);
  next.add(key);
  try {
    const tokens=scan(raw.slice(1).toUpperCase());
    if(!tokens.length || tokens.length>1000) throw Error('Formula too long');
    let position=0;
    const peek=()=>tokens[position];
    const take=()=>tokens[position++];
    const numeric=(value)=>{
      if(typeof value==='string' && value.startsWith('#')) throw Error(value);
      const number=Number(value);
      return Number.isFinite(number) ? number : 0;
    };
    const refValue=(name,active)=>{
      if(!active)return 0; // Parse inactive IF/AND/OR branches without resolving their references.
      const value=evaluateCell(name,cells,next);
      return numeric(value);
    };
    const expression=(active=true)=>{
      let value=additive(active);
      if(['>','<','>=','<=','=','<>'].includes(peek())){
        const op=take(),other=additive(active);
        value=Number(op==='>'?value>other:op==='<'?value<other:
          op==='>='?value>=other:op==='<='?value<=other:
          op==='='?value===other:value!==other);
      }
      return value;
    };
    const additive=(active=true)=>{
      let value=term(active);
      while(peek()==='+' || peek()==='-') {
        const op=take(),right=term(active);
        value=op==='+' ? value+right : value-right;
      }
      return value;
    };
    const term=(active=true)=>{
      let value=factor(active);
      while(peek()==='*' || peek()==='/') {
        const op=take(),right=factor(active);
        if(active && op==='/' && right===0) throw Error('#DIV/0!');
        value=op==='*' ? value*right : value/right;
      }
      return value;
    };
    const factor=(active=true)=>{
      const token=take();
      if(token==='-') return -factor(active);
      if(token==='+') return factor(active);
      if(token==='(') {
        const value=expression(active);
        if(take()!==')') throw Error('Missing closing parenthesis');
        return value;
      }
      if(!token) throw Error('Missing value');
      if(/^\d|^\./.test(token)) return active?Number(token):0;
      if(/^[A-Z]+[1-9][0-9]*$/.test(token)) return refValue(token,active);
      if(['SUM','AVERAGE','MIN','MAX','COUNT','COUNTA','PRODUCT','MEDIAN','ROUND','ABS','SQRT','POWER','MOD','INT','CEILING','FLOOR','SUMSQ','STDEV','VAR','SIGN','IF','AND','OR','NOT'].includes(token) && take()==='(') {
        const values=[];
        let argumentIndex=0;
        // Do not evaluate unselected conditional branches, but still check their syntax.
        const evaluateArgument=()=>active && (token==='IF'
          ? argumentIndex===0 || (argumentIndex===1 ? values[0]!==0 : values[0]===0)
          : token==='AND' ? values.every(value=>value!==0)
          : token==='OR' ? !values.some(value=>value!==0) : true);
        // COUNT counts numeric values; COUNTA counts every nonempty cell,
        // including text and formulas. Both skip empty cells in ranges.
        const addCell=(ref)=>{
          if(!active)return;
          const raw=String(cells[ref]??'');
          if(raw.trim()==='')return;
          if(token==='COUNTA'){values.push(1);return;}
          if(token==='COUNT'){
            const calculated=raw.startsWith('=')?evaluateCell(ref,cells,next):raw;
            if(typeof calculated==='string'&&calculated.startsWith('#'))throw Error(calculated);
            if(Number.isFinite(Number(calculated)))values.push(Number(calculated));
            return;
          }
          values.push(refValue(ref));
        };
        if(peek()!==')') {
          do {
            if(/^[A-Z]+[1-9][0-9]*$/.test(peek()||'') && tokens[position+1]===':') {
              const start=take();take();const end=take();
              for(const ref of cellRange(start,end)) addCell(ref);
            } else if(['COUNT','COUNTA'].includes(token) &&
              /^[A-Z]+[1-9][0-9]*$/.test(peek()||'') &&
              [',',')'].includes(tokens[position+1])){
              addCell(take());
            } else values.push(expression(evaluateArgument()));
            argumentIndex++;
            if(peek()!==',') break;
            take();
          } while(position<tokens.length);
        }
        if(take()!==')') throw Error('Missing function parenthesis');
        if(!active)return 0;
        if(token==='IF'){
          if(values.length<2||values.length>3)throw Error('IF expects condition and branches');
          return values[0]!==0?values[1]:values[2]??0;
        }
        if(token==='AND')return values.every(value=>value!==0)?1:0;
        if(token==='OR')return values.some(value=>value!==0)?1:0;
        if(token==='NOT'){
          if(values.length!==1)throw Error('NOT expects one argument');
          return values[0]===0?1:0;
        }
        if(token==='SUM') return values.reduce((a,b)=>a+b,0);
        if(token==='AVERAGE') return values.length ? values.reduce((a,b)=>a+b,0)/values.length : 0;
        if(token==='MIN') return values.length ? Math.min(...values) : 0;
        if(token==='MAX') return values.length ? Math.max(...values) : 0;
        if(token==='COUNT'||token==='COUNTA') return values.length;
        if(token==='PRODUCT') return values.reduce((a,b)=>a*b,1);
        if(token==='MEDIAN') {
          if(!values.length)return 0;
          const items=[...values].sort((a,b)=>a-b);
          const mid=Math.floor(items.length/2);
          return items.length%2?items[mid]:(items[mid-1]+items[mid])/2;
        }
        if(token==='ROUND'){
          if(values.length<1||values.length>2)throw Error('Invalid ROUND arguments');
          const precision=values.length===2?Math.trunc(values[1]):0;
          if(precision<-10||precision>10)throw Error('Invalid precision');
          const base=Math.pow(10,precision);
          return Math.round(values[0]*base)/base;
        }
        if(token==='ABS')return Math.abs(values[0]??0);
        if(token==='SQRT')return Math.sqrt(values[0]??0);
        if(token==='POWER')return Math.pow(values[0]??0,values[1]??1);
        if(token==='MOD'){
          if(values.length!==2||values[1]===0)throw Error(values[1]===0?'#DIV/0!':'Invalid MOD arguments');
          return ((values[0]%values[1])+values[1])%values[1];
        }
        if(token==='INT'){
          if(values.length!==1)throw Error('INT expects one number');
          return Math.floor(values[0]);
        }
        if(token==='SIGN'){
          if(values.length!==1)throw Error('SIGN expects one number');
          return Math.sign(values[0]);
        }
        if(token==='CEILING'||token==='FLOOR'){
          if(values.length<1||values.length>2)throw Error('Invalid rounding arguments');
          const step=values.length===2?Math.abs(values[1]):1;
          if(!step)throw Error('#DIV/0!');
          return (token==='CEILING'?Math.ceil(values[0]/step):Math.floor(values[0]/step))*step;
        }
        if(token==='SUMSQ')return values.reduce((sum,v)=>sum+v*v,0);
        if(token==='STDEV'||token==='VAR'){
          if(values.length<2)throw Error('At least two numeric values required');
          const mean=values.reduce((total,value)=>total+value,0)/values.length;
          const variance=values.reduce((total,value)=>total+(value-mean)**2,0)/(values.length-1);
          return token==='STDEV'?Math.sqrt(variance):variance;
        }
        throw Error('Unsupported function');
      }
      throw Error('Unknown token');
    };
    const result=expression();
    if(position!==tokens.length || !Number.isFinite(result)) throw Error('Invalid result');
    return Math.round((result+Number.EPSILON)*1e8)/1e8;
  } catch(error) {
    if(error.message==='#CYCLE!' || error.message==='#DIV/0!') return error.message;
    return '#ERROR!';
  }
}

export function displayCell(reference, cells) {
  return String(evaluateCell(reference,cells));
}
