import {SUPABASE_CONFIG} from './config.js';

let clientPromise;

async function client(){
  if(!navigator.onLine)throw new Error('You are offline. Your local data is still safe.');
  clientPromise??=import('https://esm.sh/@supabase/supabase-js@2').then(({createClient})=>createClient(SUPABASE_CONFIG.url,SUPABASE_CONFIG.publishableKey,{auth:{persistSession:true,autoRefreshToken:true}}));
  return clientPromise;
}

export async function currentUser(){const supabase=await client();const {data,error}=await supabase.auth.getUser();if(error&&!/session/i.test(error.message))throw error;return data.user??null}
export async function signUp(email,password){const supabase=await client();const {data,error}=await supabase.auth.signUp({email,password});if(error)throw error;return data}
export async function signIn(email,password){const supabase=await client();const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;return data}
export async function signOut(){const supabase=await client();const {error}=await supabase.auth.signOut();if(error)throw error}

export async function savePushSubscription(subscription){
  const supabase=await client();
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError||!user)throw userError??new Error('Sign in before connecting this device.');
  const json=subscription.toJSON();
  const {error}=await supabase.from('sidequest_push_subscriptions').upsert({
    user_id:user.id,
    endpoint:json.endpoint,
    p256dh:json.keys?.p256dh,
    auth:json.keys?.auth,
    user_agent:navigator.userAgent,
    updated_at:new Date().toISOString()
  },{onConflict:'user_id,endpoint'});
  if(error)throw error;
}

export async function socialState(){
  const supabase=await client();
  const {data,error}=await supabase.rpc('sidequest_social_state');
  if(error)throw error;
  return data??{profile:null,requests:[]};
}

export async function saveProfile(profile){
  const supabase=await client();
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError||!user)throw userError??new Error('Sign in before creating a profile.');
  const {error}=await supabase.from('sidequest_profiles').upsert({user_id:user.id,display_name:profile.displayName,avatar_data:profile.avatar||null,share_lessons:profile.shareLessons,share_homework:profile.shareHomework,share_completion:profile.shareCompletion,share_sparx:profile.shareSparx,updated_at:new Date().toISOString()},{onConflict:'user_id'});
  if(error)throw error;
  return socialState();
}

export async function sendFriendRequest(code){const supabase=await client();const {data,error}=await supabase.rpc('sidequest_send_friend_request',{code});if(error)throw error;return data}
export async function answerFriendRequest(id,status){const supabase=await client();const {error}=await supabase.from('sidequest_friend_requests').update({status,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;return socialState()}

export async function syncTasks(localTasks,saveLocal){
  const supabase=await client();
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError||!user)throw userError??new Error('Sign in before syncing.');
  const {data:remote,error:readError}=await supabase.from('sidequest_tasks').select('id,payload,updated_at,deleted');
  if(readError)throw readError;
  const localById=new Map(localTasks.map(task=>[task.id,task]));
  const remoteById=new Map((remote??[]).map(row=>[row.id,row]));
  const uploads=[];
  for(const task of localTasks){const row=remoteById.get(task.id);if(!row||Number(task.updatedAt)>Number(row.updated_at)){uploads.push({id:task.id,user_id:user.id,payload:task,updated_at:Number(task.updatedAt),deleted:Boolean(task.deleted)})}}
  for(const row of remote??[]){const task=localById.get(row.id);if(!task||Number(row.updated_at)>Number(task.updatedAt)){await saveLocal({...row.payload,id:row.id,updatedAt:Number(row.updated_at),deleted:Boolean(row.deleted)})}}
  if(uploads.length){const {error}=await supabase.from('sidequest_tasks').upsert(uploads,{onConflict:'user_id,id'});if(error)throw error}
  return{uploaded:uploads.length,downloaded:(remote??[]).filter(row=>{const task=localById.get(row.id);return!task||Number(row.updated_at)>Number(task.updatedAt)}).length,user};
}

export async function syncSettings(payload,updatedAt){
  const supabase=await client();
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError||!user)throw userError??new Error('Sign in before syncing.');
  const {data:remote,error:readError}=await supabase.from('sidequest_settings').select('payload,updated_at').maybeSingle();
  if(readError)throw readError;
  if(remote&&Number(remote.updated_at)>Number(updatedAt))return{direction:'download',payload:remote.payload,updatedAt:Number(remote.updated_at)};
  const {error:writeError}=await supabase.from('sidequest_settings').upsert({user_id:user.id,payload,updated_at:Number(updatedAt)},{onConflict:'user_id'});
  if(writeError)throw writeError;
  return{direction:'upload',payload,updatedAt:Number(updatedAt)};
}
