from flask import Flask, jsonify
import asyncio
import json
import threading
import time

import aiocoap.resource as resource
import aiocoap
from aiocoap import Message, Code

app = Flask(__name__)

# Shared latest readings (for now, aggregate across nodes)
sensor_data = {
    "temperature": None,
    "humidity": None,
    "pressure": None,
    "pm1": None,
    "pm25": None,
    "pm10": None,
    # Backwards-compat key if you already use it:
    "particulate_matter": None,
    "timestamp": None
}

###############################################################################
# CoAP server: /ingest
###############################################################################

class IngestResource(resource.Resource):
    """
    CoAP resource that accepts JSON POSTs from ESP32-C6 nodes.

    Expected payload (example):

        {
          "node_id": "node1",
          "temperature": 22.5,
          "humidity": 55.0,
          "pressure": 1004.0,
          "pm1": 3.2,
          "pm25": 7.8,
          "pm10": 12.4
        }

    Only temperature/humidity/pressure/PM fields are mandatory for now; node_id
    is used for logging/debugging.
    """

    async def render_post(self, request):
        try:
            payload_str = request.payload.decode("utf-8")
            data = json.loads(payload_str)
        except Exception as e:
            print("Bad CoAP payload:", e)
            return Message(code=Code.BAD_REQUEST, payload=b"invalid json")

        node_id = data.get("node_id", "unknown")
        print(f"[CoAP] Data from {node_id} ({request.remote.hostinfo}): {data}")

        # Update global latest sensor readings
        # (For multi-node, you might store per-node instead; this is simplest.)
        if "temperature" in data:
            sensor_data["temperature"] = data["temperature"]
        if "humidity" in data:
            sensor_data["humidity"] = data["humidity"]
        if "pressure" in data:
            sensor_data["pressure"] = data["pressure"]

        # PM fields; we keep both detailed and legacy "particulate_matter"
        if "pm1" in data:
            sensor_data["pm1"] = data["pm1"]
        if "pm25" in data:
            sensor_data["pm25"] = data["pm25"]
            sensor_data["particulate_matter"] = data["pm25"]
        if "pm10" in data:
            sensor_data["pm10"] = data["pm10"]

        sensor_data["timestamp"] = time.time()

        # Respond with 2.04 Changed
        return Message(code=Code.CHANGED, payload=b"OK")


async def coap_main():
    """
    Set up the CoAP server and run forever.
    """
    root = resource.Site()
    # CoAP path: coap://[Pi-addr]/ingest
    root.add_resource(['ingest'], IngestResource())

    # Bind on all IPv6 addresses, default CoAP port 5683
    await aiocoap.Context.create_server_context(root, bind=('::', 5683))

    print("[CoAP] Server listening on coap://[::]:5683/ingest")
    # Run forever
    await asyncio.get_running_loop().create_future()


def start_coap_server():
    """
    Start the CoAP server in its own asyncio event loop.
    """
    asyncio.run(coap_main())

###############################################################################
# Flask HTTP API
###############################################################################

@app.route('/api/sensors/latest', methods=['GET'])
def get_latest():
    """Get all latest sensor data (aggregate)."""
    return jsonify(sensor_data)

@app.route('/api/sensors/temperature', methods=['GET'])
def get_temperature():
    """Get only temperature data."""
    return jsonify({
        "temperature": sensor_data.get('temperature'),
        "timestamp": sensor_data.get('timestamp')
    })

@app.route('/api/sensors/humidity', methods=['GET'])
def get_humidity():
    """Get only humidity data."""
    return jsonify({
        "humidity": sensor_data.get('humidity'),
        "timestamp": sensor_data.get('timestamp')
    })

@app.route('/api/sensors/pressure', methods=['GET'])
def get_pressure():
    """Get only pressure data."""
    return jsonify({
        "pressure": sensor_data.get('pressure'),
        "timestamp": sensor_data.get('timestamp')
    })

@app.route('/api/sensors/particulate_matter', methods=['GET'])
def get_particulate_matter():
    """
    Get particulate matter data.

    For now, we expose pm2.5 under the legacy name "particulate_matter".
    """
    return jsonify({
        "particulate_matter": sensor_data.get('particulate_matter'),
        "timestamp": sensor_data.get('timestamp')
    })

@app.route('/api/sensors/pm', methods=['GET'])
def get_pm_detail():
    """Get detailed PM data (pm1, pm2.5, pm10)."""
    return jsonify({
        "pm1": sensor_data.get('pm1'),
        "pm25": sensor_data.get('pm25'),
        "pm10": sensor_data.get('pm10'),
        "timestamp": sensor_data.get('timestamp')
    })

@app.route('/api/status', methods=['GET'])
def get_status():
    """Check if server is running."""
    return jsonify({
        "status": "running",
        "message": "Sensor API is active (CoAP ingest mode)"
    })

###############################################################################
# Main entrypoint
###############################################################################

if __name__ == '__main__':
    # Start CoAP server in background thread
    coap_thread = threading.Thread(target=start_coap_server, daemon=True)
    coap_thread.start()

    print("Starting Flask server + CoAP ingest server...")
    print("CoAP endpoint: coap://[PI_THREAD_IPV6]:5683/ingest")
    print("HTTP endpoints at:")
    print("  http://149final.local:5000/api/sensors/latest")
    print("  http://149final.local:5000/api/sensors/temperature")
    print("  http://149final.local:5000/api/sensors/humidity")
    print("  http://149final.local:5000/api/sensors/pressure")
    print("  http://149final.local:5000/api/sensors/particulate_matter")
    print("  http://149final.local:5000/api/sensors/pm")

    app.run(host='0.0.0.0', port=5000, debug=True)
