// Small, safe, dependency-free formula evaluator. Never evaluates JavaScript.
export const COLUMNS = 'ABCDEFGHIJKL'.split('');
export const ROW_COUNT = 30;

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
  const regex=/\s*([A-Z]+[1-9][0-9]*|[A-Z]+|(?:\d+(?:\.\d*)?|\.\d+)|[()+\-*/:,])/gy;
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
    const refValue=(name)=>{
      const value=evaluateCell(name,cells,next);
      return numeric(value);
    };
    const expression=()=>{
      let value=term();
      while(peek()==='+' || peek()==='-') {
        const op=take(),right=term();
        value=op==='+' ? value+right : value-right;
      }
      return value;
    };
    const term=()=>{
      let value=factor();
      while(peek()==='*' || peek()==='/') {
        const op=take(),right=factor();
        if(op==='/' && right===0) throw Error('#DIV/0!');
        value=op==='*' ? value*right : value/right;
      }
      return value;
    };
    const factor=()=>{
      const token=take();
      if(token==='-') return -factor();
      if(token==='+') return factor();
      if(token==='(') {
        const value=expression();
        if(take()!==')') throw Error('Missing closing parenthesis');
        return value;
      }
      if(!token) throw Error('Missing value');
      if(/^\d|^\./.test(token)) return Number(token);
      if(/^[A-Z]+[1-9][0-9]*$/.test(token)) return refValue(token);
      if(['SUM','AVERAGE','MIN','MAX','COUNT','COUNTA','PRODUCT','MEDIAN','ROUND','ABS','SQRT','POWER'].includes(token) && take()==='(') {
        const values=[];
        if(peek()!==')') {
          do {
            if(/^[A-Z]+[1-9][0-9]*$/.test(peek()||'') && tokens[position+1]===':') {
              const start=take();take();const end=take();
              for(const ref of cellRange(start,end)) {
                if(String(cells[ref] ?? '').trim() !== '') values.push(refValue(ref));
              }
            } else values.push(expression());
            if(peek()!==',') break;
            take();
          } while(position<tokens.length);
        }
        if(take()!==')') throw Error('Missing function parenthesis');
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
