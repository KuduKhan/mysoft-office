import { cloudConfig } from './cloud-config.js';

export const cloudConfigured = Boolean(
  /^https:\/\/[a-z0-9.-]+$/i.test(cloudConfig.url) &&
  /^sb_publishable_[a-z0-9_-]+$/i.test(cloudConfig.publishableKey)
);
let clientPromise;
async function client(){
  if(!cloudConfigured)throw new Error('Cloud is not configured for this deployment.');
  if(!clientPromise){
    clientPromise=import('https://esm.sh/@supabase/supabase-js@2.118.0')
      .then(({createClient})=>createClient(cloudConfig.url,cloudConfig.publishableKey,{
        auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}
      }));
  }
  return clientPromise;
}
async function withUser(){
  const supabase=await client();
  const {data,error}=await supabase.auth.getUser();
  if(error||!data.user)throw new Error('Sign in to MySoft Cloud first.');
  if(data.user.is_anonymous)throw new Error('A verified account is required to save files.');
  return {supabase,user:data.user};
}
export async function cloudCurrentUser(){
  if(!cloudConfigured)return null;
  try {return (await withUser()).user;}catch{return null;}
}
export async function cloudSignIn(email,password,register=false){
  const supabase=await client();
  const {data,error}=register
    ? await supabase.auth.signUp({email,password})
    : await supabase.auth.signInWithPassword({email,password});
  if(error)throw error;
  return data;
}
export async function cloudSignOut(){
  const supabase=await client();
  const {error}=await supabase.auth.signOut();
  if(error)throw error;
}
export async function cloudPush(snapshot){
  const {supabase,user}=await withUser();
  const json=JSON.stringify(snapshot);
  if(json.length>1500000)throw new Error('Workspace exceeds v0.2 cloud snapshot limit (1.5MB).');
  const {error}=await supabase.from('mysoft_workspaces').upsert({
    user_id:user.id,payload:snapshot,updated_at:new Date().toISOString()
  },{onConflict:'user_id'});
  if(error)throw error;
}
export async function cloudPull(){
  const {supabase,user}=await withUser();
  const {data,error}=await supabase.from('mysoft_workspaces')
    .select('payload,updated_at').eq('user_id',user.id).maybeSingle();
  if(error)throw error;
  return data;
}
