#!/bin/sh
# READ-ONLY evidence gate. Never modifies firewall rules or live services.
set -eu
echo 'ASSPS_CORE_PERIMETER_GATE'
echo 'BOUND_INTERFACES'
ss -lnt 2>/dev/null | awk '$4 ~ /(0[.]0[.]0[.]0:|\*:|\[::\]:)/ {print $4}' | grep -E ':(3000|5000|5017|8888|3104|3105|3128|3140)$' || true
echo 'HOST_FIREWALL'
ufw status 2>/dev/null | head -n 2 || true
iptables -S INPUT 2>/dev/null | head -n 3 || true
count=$(nft list ruleset 2>/dev/null | wc -l | tr -d ' ')
echo "NFT_RULE_LINES=$count"
wild=$(ss -lnt 2>/dev/null | awk '$4 ~ /(0[.]0[.]0[.]0:|\*:|\[::\]:)/ {print $4}' | grep -Ec ':(3000|5000|5017|8888|3104|3105|3128|3140)$' || true)
ufw_active=$(ufw status 2>/dev/null | grep -c '^Status: active' || true)
default_accept=$(iptables -S INPUT 2>/dev/null | grep -c -- '^-P INPUT ACCEPT$' || true)
if [ "$wild" -gt 0 ] && [ "$ufw_active" -eq 0 ] && [ "$default_accept" -gt 0 ] && [ "$count" -eq 0 ]; then
 echo "GATE_FAIL: $wild wildcard application listeners without active local firewall policy"
 echo 'UPSTREAM_FIREWALL_UNVERIFIED: verify Hostinger ACL and independent external reachability'
 exit 3
fi
echo 'LOCAL_CHECK_REQUIRES_EXTERNAL_VALIDATION'
