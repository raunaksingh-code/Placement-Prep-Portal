import sqlite3
import sys

def delete_test():
    conn = sqlite3.connect('backend/app.db')
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM tests WHERE title LIKE '%Finance Domain Test 2%'")
    rows = cursor.fetchall()
    
    if not rows:
        print("No test found.")
        return
        
    for row in rows:
        test_id = row[0]
        print(f"Deleting test ID: {test_id}")
        cursor.execute("DELETE FROM tests WHERE id = ?", (test_id,))
    
    conn.commit()
    conn.close()
    print("Done")

if __name__ == '__main__':
    delete_test()
