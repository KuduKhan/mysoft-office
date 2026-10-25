// Read-only RGB histogram for a bounded rendered preview; source bytes never change.
export function colorHistogram(pixels){
 const result={red:Array(64).fill(0),green:Array(64).fill(0),blue:Array(64).fill(0),count:0};
 if(!pixels||!Number.isInteger(pixels.length)||pixels.length%4||pixels.length>600000)return result;
 for(let i=0;i<pixels.length;i+=4){
  if(!pixels[i+3])continue;
  result.red[Math.floor(pixels[i]/4)]++;result.green[Math.floor(pixels[i+1]/4)]++;result.blue[Math.floor(pixels[i+2]/4)]++;result.count++;
 }
 return result;
}
