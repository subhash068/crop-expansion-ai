import os
import pandas as pd
import hashlib

FARMER_NAMES = ["Ramesh Kumar", "Suresh Naidu", "Lakshmi Reddy", "Venkatesh Rao", "Srinivas Reddy", "Padma Kumari", "Krishna Murthy", "Anuradha V", "Narasimha Rao", "Ravi Teja", "Bhavani S", "Gopal Reddy", "Venkat Ramaiah", "Nagarjuna Reddy", "Vijayalakshmi", "Subba Rao"]

def get_farmer_name(parcel_id):
    # Same hash logic as JS for consistency
    hash_val = 0
    for char in str(parcel_id):
        hash_val = ord(char) + ((hash_val << 5) - hash_val)
        # To simulate 32-bit integer overflow like JS
        hash_val = (hash_val + 2**31) % 2**32 - 2**31
    return FARMER_NAMES[abs(hash_val) % len(FARMER_NAMES)]

data_dir = "public/data"
for filename in os.listdir(data_dir):
    if filename.endswith(".csv"):
        filepath = os.path.join(data_dir, filename)
        try:
            df = pd.read_csv(filepath)
            if 'parcel_id' in df.columns:
                if 'farmer_name' not in df.columns:
                    # Insert farmer_name after parcel_id
                    cols = list(df.columns)
                    idx = cols.index('parcel_id') + 1
                    
                    df['farmer_name'] = df['parcel_id'].apply(get_farmer_name)
                    
                    new_cols = cols[:idx] + ['farmer_name'] + cols[idx:]
                    df = df[new_cols]
                    df.to_csv(filepath, index=False)
                    print(f"Added farmer_name to {filename}")
                else:
                    print(f"farmer_name already in {filename}")
            else:
                print(f"Skipping {filename}, no parcel_id column")
        except Exception as e:
            print(f"Error processing {filename}: {e}")
