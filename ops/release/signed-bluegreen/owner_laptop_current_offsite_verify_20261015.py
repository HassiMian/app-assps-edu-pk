"""Run ONLY on authenticated ASSPS owner laptop. No raw secrets leave Windows."""
from __future__ import annotations
import base64,datetime,hashlib,json,struct,sys
from pathlib import Path
from cryptography.hazmat.primitives import serialization,hashes
from cryptography.hazmat.primitives.asymmetric import x25519
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
BASE=Path.home()/'Documents'/'ASSPS-Current-Encrypted-Recovery'
KEYS=BASE/'owner-keys'
PUB=KEYS/'laptop_x25519_public.pem'
PRIV=KEYS/'laptop_x25519_private.pem'
MAGIC=b'ASSPS-RECOVERY-V1\0'

def sha(blob):return hashlib.sha256(blob).hexdigest()

def init():
    assert BASE.is_dir() and KEYS.is_dir()
    assert PRIV.exists() == PUB.exists(),'Partial keypair; refuse modification'
    if not PRIV.exists():
        key=x25519.X25519PrivateKey.generate()
        private=key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption())
        public=key.public_key().public_bytes(serialization.Encoding.PEM,serialization.PublicFormat.SubjectPublicKeyInfo)
        with PRIV.open('xb') as f:f.write(private)
        with PUB.open('xb') as f:f.write(public)
    else:
        key=serialization.load_pem_private_key(PRIV.read_bytes(),password=None)
        assert isinstance(key,x25519.X25519PrivateKey)
        assert PUB.read_bytes()==key.public_key().public_bytes(serialization.Encoding.PEM,serialization.PublicFormat.SubjectPublicKeyInfo)
    print('OWNER_LAPTOP_RECIPIENT_PRIVATE_KEY_ONLY_LOCAL=PASS')
    print('OWNER_LAPTOP_PUBLIC_RECIPIENT_SHA256='+sha(PUB.read_bytes()))

def verify():
    key=serialization.load_pem_private_key(PRIV.read_bytes(),password=None)
    assert isinstance(key,x25519.X25519PrivateKey)
    manifest=json.loads((BASE/'CURRENT_OND_ENCRYPTED_MANIFEST.json').read_text())
    assert sha(PUB.read_bytes())==manifest['recipient_public_key_sha256']
    expected={'current-ond-blue.tar.zst','apexos-full-current.dump','roles-current-nopassword.sql'}
    assert {item['file'].removesuffix('.enc') for item in manifest['items']}==expected
    checked=[]
    for item in manifest['items']:
        packet=(BASE/item['file']).read_bytes()
        assert sha(packet)==item['sha256'],item['file']+' ciphertext tampered'
        assert packet.startswith(MAGIC)
        pos=len(MAGIC)
        n=struct.unpack('>I',packet[pos:pos+4])[0]
        assert 0<n<4096
        header=packet[pos+4:pos+4+n]
        meta=json.loads(header)
        assert meta['name']+'.enc'==item['file'] and meta['format']=='ASSPS-RECOVERY-V1'
        eph=x25519.X25519PublicKey.from_public_bytes(base64.b64decode(meta['ephemeral_public_b64']))
        salt=base64.b64decode(meta['salt_b64']);nonce=base64.b64decode(meta['nonce_b64'])
        shared=key.exchange(eph)
        k=HKDF(algorithm=hashes.SHA256(),length=32,salt=salt,info=b'ASSPS-OFFSITE-X25519-AESGCM-v1|'+meta['name'].encode()).derive(shared)
        plaintext=AESGCM(k).decrypt(nonce,packet[pos+4+n:],header)
        assert len(plaintext)==meta['original_size'] and sha(plaintext)==meta['original_sha256']==item['plaintext_sha256']
        checked.append(dict(name=meta['name'],result='PASS',plaintext_sha256=sha(plaintext),bytes=len(plaintext)))
        print('LAPTOP_INDEPENDENT_AEAD_DECRYPT_AND_SHA256=PASS '+meta['name'],flush=True)
        del plaintext,packet,k,shared
    evidence={'verified_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'device':'DESKTOP-MUH720M','recipient_public_sha256':sha(PUB.read_bytes()),
              'items':checked,'plaintext_files_written_on_laptop':False,
              'independent_offsite_reviewer_signed':False,'live_traffic_rollback_performed':False}
    (BASE/'LOCAL_TECHNICAL_RECOVERY_VERIFICATION.json').write_text(json.dumps(evidence,indent=2)+'\n')
    print('ACTUAL_OFFVPS_OWNER_LAPTOP_RECOVERY='+str(len(checked))+'/'+str(len(expected))+' PASS')
    print('NO_PLAINTEXT_ARTIFACTS_STORED=PASS')

if __name__=='__main__':
    {'init':init,'verify':verify}[sys.argv[1]]()
