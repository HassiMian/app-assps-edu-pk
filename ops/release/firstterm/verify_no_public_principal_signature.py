#!/usr/bin/env python3
"""Verify anonymous Principal-signature access is denied. GET body is never read."""
import argparse
import json
import urllib.error
import urllib.request

DEFAULT="https://app.assps.edu.pk/principal-signature.png"

def check(url=DEFAULT):
    try:
        req=urllib.request.Request(url,method="HEAD",headers={"User-Agent":"ASSPS-ReadOnly-Privacy-Check/1.0"})
        try:
            with urllib.request.urlopen(req,timeout=8) as rsp:
                code=rsp.status
                cache=rsp.headers.get("Cache-Control","")
        except urllib.error.HTTPError as err:
            code=err.code
            cache=err.headers.get("Cache-Control","")
        passed=(code==403 and "no-store" in cache.lower())
        return {"status":"PASS" if passed else "HOLD","http_status":code,"no_store": "no-store" in cache.lower()}
    except (OSError,ValueError) as exc:
        return {"status":"HOLD","reason":"SIGNATURE_PRIVACY_PROBE_ERROR","error_class":type(exc).__name__}

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--url",default=DEFAULT)
    args=parser.parse_args()
    result=check(args.url)
    print(json.dumps(result,sort_keys=True))
    raise SystemExit(0 if result["status"]=="PASS" else 2)
