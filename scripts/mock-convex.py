#!/usr/bin/env python3
"""
Mock Convex server for testing geo-service without real backend
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os
from urllib.parse import urlparse, parse_qs

class MockConvexHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/aois':
            # Load AOIs from data file
            data_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'aois.json')
            with open(data_path, 'r') as f:
                aois = json.load(f)
            
            # Handle query parameters
            query_params = parse_qs(parsed_path.query)
            
            # Filter by type if specified
            if 'type' in query_params:
                type_filter = query_params['type'][0]
                aois = [a for a in aois if a['type'] == type_filter]
            
            # Filter by query if specified
            if 'q' in query_params:
                q = query_params['q'][0].lower()
                aois = [a for a in aois if 
                       q in a['id'].lower() or 
                       q in a['name'].lower() or 
                       q in a.get('description', '').lower()]
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(aois).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        # Suppress log messages for cleaner output
        pass

if __name__ == '__main__':
    server_address = ('', 8001)
    httpd = HTTPServer(server_address, MockConvexHandler)
    print('Mock Convex server running on http://localhost:8001')
    print('Press Ctrl+C to stop')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down mock server...')
        httpd.shutdown()
