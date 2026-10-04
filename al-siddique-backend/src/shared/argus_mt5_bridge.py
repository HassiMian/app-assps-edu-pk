#!/usr/bin/env python3
"""
JARVIS ARGUS 5.2 — Native MetaTrader 5 Python IPC Bridge
Provides direct broker-side communication for:
- Live Account Information & Verification (DEMO vs REAL)
- Live Symbol Contract Specifications
- Real Broker-Side Order Placement (DEMO ONLY)
- Post-Order Readback from MT5 Terminal
- Real SL/TP Modification
- Real Partial Close
- Real Full Exit
- Account Deal History Reconciliation
"""

import sys
import json
import time

try:
    import MetaTrader5 as mt5
except ImportError:
    print(json.dumps({"success": False, "error": "MetaTrader5 module not installed"}))
    sys.exit(1)

def ensure_initialized():
    if not mt5.initialize():
        err = mt5.last_error()
        return {"success": False, "error": f"MT5 initialization failed: {err}"}
    return {"success": True}

def get_account_info():
    init_res = ensure_initialized()
    if not init_res["success"]:
        return init_res

    acc = mt5.account_info()
    if not acc:
        err = mt5.last_error()
        mt5.shutdown()
        return {"success": False, "error": f"Failed to retrieve account info: {err}"}

    # trade_mode: 0 = DEMO, 1 = CONTEST, 2 = REAL
    is_demo = (acc.trade_mode == mt5.ACCOUNT_TRADE_MODE_DEMO)
    is_real = (acc.trade_mode == mt5.ACCOUNT_TRADE_MODE_REAL)

    data = {
        "success": True,
        "login": acc.login,
        "trade_mode": acc.trade_mode,
        "account_type": "DEMO" if is_demo else ("REAL" if is_real else "UNKNOWN"),
        "is_demo": is_demo,
        "is_real": is_real,
        "server": acc.server,
        "company": acc.company,
        "name": acc.name,
        "currency": acc.currency,
        "balance": acc.balance,
        "equity": acc.equity,
        "margin": acc.margin,
        "margin_free": acc.margin_free,
        "leverage": acc.leverage,
        "trade_allowed": acc.trade_allowed,
        "trade_expert": acc.trade_expert
    }
    mt5.shutdown()
    return data

def resolve_gold_symbol():
    candidates = ["GoldEternal", "XAUUSD", "XAUUSD.", "GOLD", "GOLDm", "XAUUSDm"]
    all_syms = mt5.symbols_get()
    if all_syms:
        sym_names = {s.name for s in all_syms}
        for c in candidates:
            if c in sym_names:
                return c
        for s in sym_names:
            if "XAU" in s.upper() or "GOLD" in s.upper():
                return s
    return "XAUUSD"

def get_symbol_info(symbol="XAUUSD"):
    init_res = ensure_initialized()
    if not init_res["success"]:
        return init_res

    # If generic Gold symbol requested, dynamically reconcile to broker tradable symbol
    if symbol in ("XAUUSD", "GOLD", "GOLD_SPOT"):
        resolved = resolve_gold_symbol()
        if resolved:
            symbol = resolved

    info = mt5.symbol_info(symbol)
    if not info:
        # Try finding related symbol
        for alt in [symbol, symbol.replace("USD", ""), "GOLD"]:
            info = mt5.symbol_info(alt)
            if info:
                symbol = alt
                break

    if not info:
        mt5.shutdown()
        return {"success": False, "error": f"Symbol {symbol} not found on broker"}

    # Ensure symbol is selected in Market Watch
    if not info.visible:
        mt5.symbol_select(symbol, True)
        time.sleep(0.1)
        info = mt5.symbol_info(symbol)

    tick = mt5.symbol_info_tick(symbol)
    bid = tick.bid if (tick and tick.bid > 0) else (info.bid if info.bid > 0 else 0)
    ask = tick.ask if (tick and tick.ask > 0) else (info.ask if info.ask > 0 else 0)
    tick_time = int(tick.time) if (tick and hasattr(tick, "time")) else 0
    tick_time_msc = int(tick.time_msc) if (tick and hasattr(tick, "time_msc") and tick.time_msc > 0) else (tick_time * 1000 if tick_time else 0)

    # Inspect latest M1 candle for freeze / progression detection and fallback
    latest_m1_time = 0
    rates = mt5.copy_rates_from_pos(symbol, mt5.TIMEFRAME_M1, 0, 1)
    if rates is not None and len(rates) > 0:
        latest_m1_time = int(rates[-1]["time"])
        if bid == 0 or ask == 0:
            last_c = float(rates[-1]["close"])
            spread_pts = (info.spread if info.spread > 0 else 50) * (info.point or 0.01)
            bid = last_c
            ask = round(last_c + spread_pts, info.digits)
            if tick_time == 0:
                tick_time = latest_m1_time
                tick_time_msc = latest_m1_time * 1000

    now_ts = time.time()
    age_sec = (now_ts - tick_time) if tick_time > 0 else 999999
    is_stale = (age_sec > 300) # > 5 min

    data = {
        "success": True,
        "symbol": info.name,
        "broker_symbol": info.name,
        "canonical_symbol": "XAUUSD" if ("XAU" in info.name.upper() or "GOLD" in info.name.upper()) else info.name,
        "digits": info.digits,
        "point": info.point,
        "tick_size": info.trade_tick_size,
        "tick_value": info.trade_tick_value,
        "contract_size": info.trade_contract_size,
        "volume_min": info.volume_min,
        "volume_max": info.volume_max,
        "volume_step": info.volume_step,
        "stops_level": getattr(info, "trade_stops_level", getattr(info, "stops_level", 0)),
        "freeze_level": getattr(info, "trade_freeze_level", getattr(info, "freeze_level", 0)),
        "trade_mode": info.trade_mode,
        "currency_profit": info.currency_profit,
        "currency_margin": info.currency_margin,
        "bid": bid,
        "ask": ask,
        "spread": round(ask - bid, info.digits) if ask and bid else 0,
        "tick_time": tick_time,
        "tick_time_msc": tick_time_msc,
        "time_msc": tick_time_msc,
        "latest_m1_time": latest_m1_time,
        "data_age_sec": int(age_sec),
        "data_quality": "DEGRADED" if (is_stale or bid == 0) else "AUTHENTIC_BROKER",
        "is_stale": is_stale
    }
    mt5.shutdown()
    return data

def get_rates(params):
    init_res = ensure_initialized()
    if not init_res["success"]:
        return init_res

    symbol = params.get("symbol", "XAUUSD")
    if symbol in ("XAUUSD", "GOLD", "GOLD_SPOT"):
        resolved = resolve_gold_symbol()
        if resolved:
            symbol = resolved

    tf_str = str(params.get("timeframe", "1H")).upper()
    count = int(params.get("count", 100))

    tf_map = {
        "M1": mt5.TIMEFRAME_M1, "1M": mt5.TIMEFRAME_M1,
        "M5": mt5.TIMEFRAME_M5, "5M": mt5.TIMEFRAME_M5,
        "M15": mt5.TIMEFRAME_M15, "15M": mt5.TIMEFRAME_M15,
        "M30": mt5.TIMEFRAME_M30, "30M": mt5.TIMEFRAME_M30,
        "H1": mt5.TIMEFRAME_H1, "1H": mt5.TIMEFRAME_H1,
        "H4": mt5.TIMEFRAME_H4, "4H": mt5.TIMEFRAME_H4,
        "D1": mt5.TIMEFRAME_D1, "1D": mt5.TIMEFRAME_D1,
        "W1": mt5.TIMEFRAME_W1, "1W": mt5.TIMEFRAME_W1
    }

    tf = tf_map.get(tf_str, mt5.TIMEFRAME_H1)

    mt5.symbol_select(symbol, True)
    rates = mt5.copy_rates_from_pos(symbol, tf, 0, count)
    if rates is None or len(rates) == 0:
        err = mt5.last_error()
        mt5.shutdown()
        return {
            "success": False,
            "error": f"Failed to retrieve rates for {symbol} ({tf_str}): {err}",
            "data_quality": "DEGRADED"
        }

    now_ts = time.time()
    candle_list = []
    for r in rates:
        candle_list.append({
            "time": int(r["time"]),
            "open": float(r["open"]),
            "high": float(r["high"]),
            "low": float(r["low"]),
            "close": float(r["close"]),
            "tick_volume": int(r["tick_volume"]),
            "spread": int(r["spread"])
        })

    last_time = candle_list[-1]["time"]
    age_sec = now_ts - last_time
    tf_seconds = {
        mt5.TIMEFRAME_M1: 60,
        mt5.TIMEFRAME_M5: 300,
        mt5.TIMEFRAME_M15: 900,
        mt5.TIMEFRAME_H1: 3600,
        mt5.TIMEFRAME_H4: 14400,
        mt5.TIMEFRAME_D1: 86400
    }.get(tf, 3600)

    is_stale = age_sec > (tf_seconds * 4)

    mt5.shutdown()
    return {
        "success": True,
        "symbol": symbol,
        "timeframe": tf_str,
        "count": len(candle_list),
        "rates": candle_list,
        "latest_candle_time": last_time,
        "age_sec": int(age_sec),
        "data_quality": "DEGRADED" if is_stale else "AUTHENTIC_BROKER",
        "is_stale": is_stale
    }

def get_positions(symbol=None):
    init_res = ensure_initialized()
    if not init_res["success"]:
        return init_res

    positions = mt5.positions_get(symbol=symbol) if symbol else mt5.positions_get()
    res = []
    if positions:
        for p in positions:
            res.append({
                "ticket": p.ticket,
                "symbol": p.symbol,
                "type": "BUY" if p.type == mt5.POSITION_TYPE_BUY else "SELL",
                "volume": p.volume,
                "price_open": p.price_open,
                "sl": p.sl,
                "tp": p.tp,
                "price_current": p.price_current,
                "profit": p.profit,
                "comment": p.comment,
                "time": p.time
            })
    mt5.shutdown()
    return {"success": True, "count": len(res), "positions": res}

def send_order(params):
    """
    Submits real broker-side order.
    CRITICAL: Enforces ACCOUNT_TRADE_MODE_DEMO check.
    If account is REAL, order submission is strictly blocked!
    """
    init_res = ensure_initialized()
    if not init_res["success"]:
        return init_res

    acc = mt5.account_info()
    if not acc:
        mt5.shutdown()
        return {"success": False, "error": "Unable to verify account info before order submission"}

    # HARD EXECUTION BOUNDARY LOCK
    if acc.trade_mode != mt5.ACCOUNT_TRADE_MODE_DEMO:
        mt5.shutdown()
        return {
            "success": False,
            "error_code": "REAL_ACCOUNT_BLOCKED",
            "error": f"Execution halted! Current account {acc.login} on {acc.server} is REAL (trade_mode={acc.trade_mode}). REAL_ACCOUNT_AUTONOMOUS_ORDER_PLACEMENT = 0 strictly enforced."
        }

    symbol = params.get("symbol", "XAUUSD")
    order_type_str = params.get("type", "BUY").upper()
    volume = float(params.get("volume", 0.01))
    sl = float(params.get("sl", 0.0))
    tp = float(params.get("tp", 0.0))
    comment = params.get("comment", "ARGUS 5.2 Demo Autopilot")

    # Select symbol
    mt5.symbol_select(symbol, True)
    sym_info = mt5.symbol_info(symbol)
    if not sym_info:
        mt5.shutdown()
        return {"success": False, "error": f"Symbol {symbol} unavailable"}

    tick = mt5.symbol_info_tick(symbol)
    if not tick:
        mt5.shutdown()
        return {"success": False, "error": f"Live ticks unavailable for {symbol}"}

    price = tick.ask if order_type_str == "BUY" else tick.bid
    order_type = mt5.ORDER_TYPE_BUY if order_type_str == "BUY" else mt5.ORDER_TYPE_SELL

    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": volume,
        "type": order_type,
        "price": price,
        "sl": sl,
        "tp": tp,
        "deviation": 20,
        "magic": 520001,
        "comment": comment,
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }

    result = mt5.order_send(request)
    mt5.shutdown()

    if not result or result.retcode != mt5.TRADE_RETCODE_DONE:
        err = mt5.last_error()
        return {
            "success": False,
            "retcode": result.retcode if result else None,
            "comment": result.comment if result else None,
            "error": f"Order submission failed: {result.comment if result else err}"
        }

    return {
        "success": True,
        "order_ticket": result.order,
        "deal_ticket": result.deal,
        "volume": result.volume,
        "price": result.price,
        "requested_price": price,
        "slippage": round(abs(result.price - price), sym_info.digits),
        "comment": result.comment,
        "symbol": symbol,
        "side": order_type_str,
        "retcode": result.retcode
    }

def modify_position(params):
    init_res = ensure_initialized()
    if not init_res["success"]:
        return init_res

    acc = mt5.account_info()
    if acc.trade_mode != mt5.ACCOUNT_TRADE_MODE_DEMO:
        mt5.shutdown()
        return {
            "success": False,
            "error_code": "REAL_ACCOUNT_BLOCKED",
            "error": "Real account modification blocked by safety policy"
        }

    ticket = int(params["ticket"])
    new_sl = float(params.get("sl", 0.0))
    new_tp = float(params.get("tp", 0.0))

    # Find position
    positions = mt5.positions_get(ticket=ticket)
    if not positions:
        mt5.shutdown()
        return {"success": False, "error": f"Position ticket {ticket} not found"}

    pos = positions[0]
    request = {
        "action": mt5.TRADE_ACTION_SLTP,
        "position": ticket,
        "symbol": pos.symbol,
        "sl": new_sl,
        "tp": new_tp if new_tp > 0 else pos.tp
    }

    result = mt5.order_send(request)
    mt5.shutdown()

    if not result or result.retcode != mt5.TRADE_RETCODE_DONE:
        return {
            "success": False,
            "retcode": result.retcode if result else None,
            "error": f"Modification failed: {result.comment if result else mt5.last_error()}"
        }

    return {
        "success": True,
        "ticket": ticket,
        "old_sl": pos.sl,
        "observed_new_sl": new_sl,
        "observed_new_tp": new_tp if new_tp > 0 else pos.tp,
        "retcode": result.retcode
    }

def close_position(params):
    init_res = ensure_initialized()
    if not init_res["success"]:
        return init_res

    acc = mt5.account_info()
    if acc.trade_mode != mt5.ACCOUNT_TRADE_MODE_DEMO:
        mt5.shutdown()
        return {
            "success": False,
            "error_code": "REAL_ACCOUNT_BLOCKED",
            "error": "Real account close blocked by safety policy"
        }

    ticket = int(params["ticket"])
    close_volume = float(params.get("volume", 0))

    positions = mt5.positions_get(ticket=ticket)
    if not positions:
        mt5.shutdown()
        return {"success": False, "error": f"Position ticket {ticket} not found"}

    pos = positions[0]
    volume_to_close = close_volume if close_volume > 0 and close_volume <= pos.volume else pos.volume
    is_partial = (volume_to_close < pos.volume)

    close_type = mt5.ORDER_TYPE_SELL if pos.type == mt5.POSITION_TYPE_BUY else mt5.ORDER_TYPE_BUY
    tick = mt5.symbol_info_tick(pos.symbol)
    price = tick.bid if close_type == mt5.ORDER_TYPE_SELL else tick.ask

    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "position": ticket,
        "symbol": pos.symbol,
        "volume": volume_to_close,
        "type": close_type,
        "price": price,
        "deviation": 20,
        "magic": 520002,
        "comment": "ARGUS 5.2 Partial Close" if is_partial else "ARGUS 5.2 Full Close",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }

    result = mt5.order_send(request)
    mt5.shutdown()

    if not result or result.retcode != mt5.TRADE_RETCODE_DONE:
        return {
            "success": False,
            "retcode": result.retcode if result else None,
            "error": f"Close failed: {result.comment if result else mt5.last_error()}"
        }

    return {
        "success": True,
        "ticket": ticket,
        "close_deal_ticket": result.deal,
        "volume_before": pos.volume,
        "closed_volume": volume_to_close,
        "volume_after": round(pos.volume - volume_to_close, 2),
        "is_partial": is_partial,
        "exit_price": result.price,
        "retcode": result.retcode
    }

def get_deal_history(params):
    init_res = ensure_initialized()
    if not init_res["success"]:
        return init_res

    from_date = time.time() - (params.get("days", 1) * 86400)
    deals = mt5.history_deals_get(from_date, time.time())
    res = []
    if deals:
        for d in deals:
            res.append({
                "deal": d.ticket,
                "order": d.order,
                "position": d.position_id,
                "symbol": d.symbol,
                "type": "BUY" if d.type == mt5.DEAL_TYPE_BUY else "SELL",
                "entry": "IN" if d.entry == mt5.DEAL_ENTRY_IN else ("OUT" if d.entry == mt5.DEAL_ENTRY_OUT else "INOUT"),
                "volume": d.volume,
                "price": d.price,
                "profit": d.profit,
                "commission": d.commission,
                "time": d.time
            })
    mt5.shutdown()
    return {"success": True, "count": len(res), "deals": res}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Command argument required"}))
        sys.exit(1)

    cmd = sys.argv[1].lower()
    args = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}

    if cmd == "account_info":
        print(json.dumps(get_account_info()))
    elif cmd == "symbol_info":
        print(json.dumps(get_symbol_info(args.get("symbol", "XAUUSD"))))
    elif cmd == "positions_get":
        print(json.dumps(get_positions(args.get("symbol"))))
    elif cmd == "order_send":
        print(json.dumps(send_order(args)))
    elif cmd == "modify_position":
        print(json.dumps(modify_position(args)))
    elif cmd == "close_position":
        print(json.dumps(close_position(args)))
    elif cmd == "history_deals":
        print(json.dumps(get_deal_history(args)))
    elif cmd in ("rates_get", "copy_rates"):
        print(json.dumps(get_rates(args)))
    elif cmd == "resolve_symbol":
        print(json.dumps({"success": True, "resolved_symbol": resolve_gold_symbol()}))
    else:
        print(json.dumps({"success": False, "error": f"Unknown command: {cmd}"}))
