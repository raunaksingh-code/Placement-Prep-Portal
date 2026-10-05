import sqlite3
import sys

def list_tests():
    conn = sqlite3.connect('backend/app.db')
    cursor = conn.cursor()
    cursor.execute("SELECT id, title FROM tests WHERE title LIKE '%Finance%'")
    rows = cursor.fetchall()
    
    for row in rows:
        print(row)
        
    conn.close()

if __name__ == '__main__':
    list_tests()
