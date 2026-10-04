export const PROFILES={
  'local-only':{
    description:'All divisions run privately on the local Windows PC; no public control plane required.',
    requires:{oracle:false,tls:false,edge:false,remoteBackup:false},
    allowedPublicPorts:[],
    heavyCompute:'local',
    notes:['Keep all service binds loopback-only.','Use this profile for initial calibration and offline school operation.']
  },
  'hybrid-oracle':{
    description:'Oracle hosts the lightweight 24/7 control plane; the local PC remains the private execution node.',
    requires:{oracle:true,tls:true,edge:true,remoteBackup:true},
    allowedPublicPorts:[443],
    heavyCompute:'local',
    notes:['Only Nginx/HTTPS should be internet-facing.','Local School/Growth/ARGUS/Model services must remain private.','Edge worker initiates outbound connection.']
  },
  'cloud-control':{
    description:'Control-plane-only Oracle deployment without a permanently connected local execution node.',
    requires:{oracle:true,tls:true,edge:false,remoteBackup:true},
    allowedPublicPorts:[443],
    heavyCompute:'none',
    notes:['Use for monitoring/queue persistence only.','Do not move student databases or heavy AI workloads here by default.']
  }
};

export function deploymentProfile(name='local-only'){
  const p=PROFILES[name];
  if(!p)throw Object.assign(new Error(`unknown deployment profile: ${name}`),{status:400});
  return {name,...p};
}

export function evaluateProfile(name,env=process.env,{connectors=null}={}){
  const p=deploymentProfile(name),errors=[],warnings=[];
  const loopback=v=>!v||['127.0.0.1','localhost','::1'].includes(String(v));
  if(name==='local-only'){
    for(const [key,val] of [['CONTROLLER_BIND',env.CONTROLLER_BIND],['GROWTH_BIND',env.GROWTH_BIND],['ARGUS_BIND',env.ARGUS_BIND],['SECURITY_BIND',env.SECURITY_BIND],['MODEL_BIND',env.MODEL_BIND]]) if(!loopback(val)) errors.push(`${key} must remain loopback in local-only profile`);
  }
  if(p.requires.oracle){
    if(!(env.ORACLE_CONTROL_URL||env.JARVIS_CLOUD_URL||env.ORACLE_PUBLIC_HOST))errors.push('Oracle control-plane URL/host is required');
    if(String(env.JARVIS_CLOUD_ADMIN_TOKEN||'').length<32)errors.push('JARVIS_CLOUD_ADMIN_TOKEN is required');
  }
  if(p.requires.edge&&String(env.JARVIS_EDGE_TOKEN||'').length<32)errors.push('JARVIS_EDGE_TOKEN is required');
  if(p.requires.tls){
    const u=env.ORACLE_CONTROL_URL||env.JARVIS_CLOUD_URL||env.ORACLE_PUBLIC_HOST||'';
    if(!String(u).startsWith('https://'))errors.push('Oracle public/control URL must use HTTPS');
  }
  if(p.requires.remoteBackup&&!Boolean(env.REMOTE_BACKUP_DIR||env.JARVIS_REMOTE_BACKUP_DIR||env.OCI_BACKUP_TARGET||env.JARVIS_REMOTE_BACKUP_COMMAND))errors.push('Remote/off-device backup target is required');
  if(connectors&&!connectors.ok)errors.push(...connectors.blockers.map(x=>`connector:${x}`));
  if(name==='hybrid-oracle'&&env.CLOUD_BIND==='0.0.0.0')warnings.push('Cloud service is externally bound; verify Nginx/TLS/UFW restrict direct access to the app port.');
  return {profile:p,ok:errors.length===0,errors,warnings};
}
