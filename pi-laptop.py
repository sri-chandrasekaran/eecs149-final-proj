from flask import Flask, jsonify
import asyncio
from aiocoap import Context, Message, GET
import json
import threading
import time
import random

app = Flask(__name__)

sensor_data = {
    "temperature": None,
    "humidity": None,
    "pressure": None,
    "particulate_matter": None,
    "timestamp": None
}

# def generate_fake_data():
#     """Generate fake sensor data"""
#     temperature = round(random.uniform(18.0, 28.0), 2)
#     humidity = round(random.uniform(30.0, 70.0), 2)
#     pressure = round(random.uniform(990.0, 1025.0), 2)
#     particulate_matter = round(random.uniform(5.0, 50.0), 2)
#     return temperature, humidity, pressure, particulate_matter

# def sensor_poll_loop():
#     """Background thread to generate fake sensor data"""
#     while True:
#         temp, humidity, pressure, particulate_matter = generate_fake_data()
        
#         sensor_data['temperature'] = temp
#         sensor_data['humidity'] = humidity
#         sensor_data['pressure'] = pressure
#         sensor_data['particulate_matter'] = particulate_matter
#         sensor_data['timestamp'] = time.time()
        
#         print(f"Generated fake data - Temp: {temp}°C, Humidity: {humidity}%, Pressure: {pressure}hPa, Particulate Matter: {particulate_matter}µg/m³")
#         time.sleep(5)


SENSOR_CONFIG = {
    "temperature": {
        "ipv6": "fd11:22::1234:5678",  
        "resource": "/sensors/temperature"
    },
    "humidity": {
        "ipv6": "fd11:22::1234:5678", 
        "resource": "/sensors/humidity"
    },
    "pressure": {
        "ipv6": "fd11:22::abcd:ef01", 
        "resource": "/sensors/pressure"
    },
    "particulate_matter": {
        "ipv6": "fd11:22::abcd:ef01", 
        "resource": "/sensors/pm"
    }
}

# thread to pi
async def poll_coap_sensor(ipv6_address, resource_path):
    """Poll a CoAP sensor and return the value"""
    try:
        context = await Context.create_client_context()
        uri = f'coap://[{ipv6_address}]{resource_path}'
        request = Message(code=GET, uri=uri)
        
        response = await context.request(request).response
        
        payload = response.payload.decode('utf-8')
        
        try:
            data = json.loads(payload)
            return data.get('value') or data 
        except json.JSONDecodeError:
            return float(payload)
            
    except Exception as e:
        print(f'Error polling {ipv6_address}{resource_path}: {e}')
        return None

def sensor_poll_loop():
    """Background thread to poll real CoAP sensors"""
    while True:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            temp = loop.run_until_complete(
                poll_coap_sensor(
                    SENSOR_CONFIG['temperature']['ipv6'],
                    SENSOR_CONFIG['temperature']['resource']
                )
            )
            
            humidity = loop.run_until_complete(
                poll_coap_sensor(
                    SENSOR_CONFIG['humidity']['ipv6'],
                    SENSOR_CONFIG['humidity']['resource']
                )
            )
            
            pressure = loop.run_until_complete(
                poll_coap_sensor(
                    SENSOR_CONFIG['pressure']['ipv6'],
                    SENSOR_CONFIG['pressure']['resource']
                )
            )
            
            pm = loop.run_until_complete(
                poll_coap_sensor(
                    SENSOR_CONFIG['particulate_matter']['ipv6'],
                    SENSOR_CONFIG['particulate_matter']['resource']
                )
            )
            
            if temp is not None:
                sensor_data['temperature'] = temp
            if humidity is not None:
                sensor_data['humidity'] = humidity
            if pressure is not None:
                sensor_data['pressure'] = pressure
            if pm is not None:
                sensor_data['particulate_matter'] = pm
            
            sensor_data['timestamp'] = time.time()
            
            print(f"Polled sensors - Temp: {temp}°C, Humidity: {humidity}%, "
                  f"Pressure: {pressure}hPa, PM: {pm}µg/m³")
            
        except Exception as e:
            print(f"Error in polling loop: {e}")
        finally:
            loop.close()
        
        time.sleep(10) 

@app.route('/api/sensors/latest', methods=['GET'])
def get_latest():
    """Get all latest sensor data"""
    return jsonify(sensor_data)

@app.route('/api/sensors/temperature', methods=['GET'])
def get_temperature():
    """Get only temperature data"""
    return jsonify({
        "temperature": sensor_data.get('temperature'),
        "timestamp": sensor_data.get('timestamp')
    })

@app.route('/api/sensors/humidity', methods=['GET'])
def get_humidity():
    """Get only humidity data"""
    return jsonify({
        "humidity": sensor_data.get('humidity'),
        "timestamp": sensor_data.get('timestamp')
    })

@app.route('/api/sensors/pressure', methods=['GET'])
def get_pressure():
    """Get only humidity data"""
    return jsonify({
        "pressure": sensor_data.get('pressure'),
        "timestamp": sensor_data.get('timestamp')
    })

@app.route('/api/sensors/particulate_matter', methods=['GET'])
def get_particulate_matter():
    """Get only humidity data"""
    return jsonify({
        "particulate_matter": sensor_data.get('particulate_matter'),
        "timestamp": sensor_data.get('timestamp')
    })

@app.route('/api/status', methods=['GET'])
def get_status():
    """Check if server is running"""
    return jsonify({
        "status": "running",
        "message": "Sensor API is active (fake data mode)"
    })

if __name__ == '__main__':
    poll_thread = threading.Thread(target=sensor_poll_loop, daemon=True)
    poll_thread.start()
    
    print("Starting Flask server with fake sensor data...")
    print("Access endpoints at:")
    print("  http://149final.local:5000/api/sensors/latest")
    print("  http://149final.local:5000/api/sensors/temperature")
    print("  http://149final.local:5000/api/sensors/humidity")
    print("  http://149final.local:5000/api/sensors/pressure")
    print("  http://149final.local:5000/api/sensors/particulate_matter")
    
    # Run Flask server (accessible from laptop)
    app.run(host='0.0.0.0', port=5000, debug=True)