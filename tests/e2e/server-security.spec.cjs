const {test,expect}=require('@playwright/test');

test('local HTTP server only serves public application assets',async({request})=>{
  for(const path of ['/.git/HEAD','/.git/config','/package.json','/.env.local','/supabase/schema.sql','/scripts/server.mjs','/tests/workspace-storage.test.js']){
    const response=await request.get(path);
    expect(response.status(),path).toBe(404);
  }
  for(const path of ['/','/index.html','/src/app.js','/src/workspace-storage.js','/src/studio-refinement.css','/assets/favicon.svg']){
    const response=await request.get(path);
    expect(response.status(),path).toBe(200);
  }
  const response=await request.post('/index.html',{data:'no'});
  expect(response.status()).toBe(405);
  expect(response.headers().allow).toBe('GET, HEAD');
});
