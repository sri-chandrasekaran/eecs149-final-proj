from flask import Flask, jsonify
import asyncio
import json
import threading
import time

import aiocoap.resource as resource
import aiocoap
from aiocoap import Message, Code

app = Flask(__name__)

# Latest payload per node_id:
# {
#   "node-01": { ... last JSON from node-01 ..., "timestamp": ... },
#   "node-02": { ... last JSON from node-02 ..., "timestamp": ... },
#   ...
# }
node_data = {}

###############################################################################
# CoAP server: /ingest
###############################################################################

class IngestResource(resource.Resource):
    """
    CoAP resource that accepts JSON POSTs from ESP32-C6 nodes.

    Expected payload (example):

        {
          "node_id": "node-01",
          "temperature_c": 22.5,
          "humidity": 55.0,
          "pressure_hpa": 1004.0,
          "pm1": 3.2,
          "pm25": 7.8,
          "pm10": 12.4
        }

    We store the full JSON payload per node_id, plus a server-side timestamp.
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

        # Copy and add timestamp
        entry = dict(data)
        entry["timestamp"] = time.time()

        # Store by node_id
        node_data[node_id] = entry

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

@app.route('/api/sensors', methods=['GET'])
def get_all_sensors():
    """
    Return the latest JSON payload for all nodes.

    Response shape:

        {
          "node-01": { ... last payload + timestamp ... },
          "node-02": { ... },
          ...
        }
    """
    return jsonify(node_data)


@app.route('/api/status', methods=['GET'])
def get_status():
    """Simple health check."""
    return jsonify({
        "status": "running",
        "message": "Sensor API is active (CoAP ingest mode)",
        "node_count": len(node_data),
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
    print("HTTP endpoints:")
    print("  http://149final.local:5000/api/sensors   (all nodes)")
    print("  http://149final.local:5000/api/status    (health)")

    app.run(host='0.0.0.0', port=5000, debug=True)
