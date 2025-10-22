'''
Business: Save reaction game result to database
Args: event - dict with httpMethod, body (JSON with player_name and reaction_time)
      context - object with request_id attribute
Returns: HTTP response with saved result data
'''

import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Database configuration missing'})
        }
    
    body_data = json.loads(event.get('body', '{}'))
    player_name = body_data.get('player_name', 'Игрок')
    reaction_time = body_data.get('reaction_time')
    
    if not reaction_time:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'reaction_time is required'})
        }
    
    conn = psycopg2.connect(database_url)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute(
        "INSERT INTO game_results (player_name, reaction_time) VALUES (%s, %s) RETURNING id, player_name, reaction_time, created_at",
        (player_name, int(reaction_time))
    )
    result = cursor.fetchone()
    
    conn.commit()
    cursor.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'isBase64Encoded': False,
        'body': json.dumps({
            'id': result['id'],
            'player_name': result['player_name'],
            'reaction_time': result['reaction_time'],
            'created_at': result['created_at'].isoformat()
        })
    }
