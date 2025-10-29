import csv
import re
from collections import defaultdict

# Read the CSV file
assets = []
with open('../asset-mgt-fe/sid asset files/Copy of mindstix_assets - mindstix_assets(1).csv', 'r') as f:
    reader = csv.DictReader(f)
    for i, row in enumerate(reader):
        if i >= 648 and i < 1409:  # Lines 649-1410 (0-indexed)
            assets.append(row)

# Analyze asset names to extract type, brand, and model
asset_info = defaultdict(lambda: {'type': set(), 'brand': set(), 'model': set(), 'examples': []})

for asset in assets:
    name = asset.get('name', '').strip()
    if not name or name in ['l', '']:
        continue
    
    # Extract info from name
    if 'MacBook' in name:
        asset_info['MacBook']['type'].add('Laptop')
        asset_info['MacBook']['brand'].add('Apple')
        if 'Retina' in name:
            asset_info['MacBook']['model'].add('MacBook Pro Retina')
        elif 'Non-Retina' in name:
            asset_info['MacBook']['model'].add('MacBook Pro Non-Retina')
        else:
            asset_info['MacBook']['model'].add('MacBook Pro')
        asset_info['MacBook']['examples'].append(name)
    
    elif 'Dell Inspiron' in name or 'Dell Insperon' in name:
        asset_info['Dell Inspiron']['type'].add('Laptop')
        asset_info['Dell Inspiron']['brand'].add('Dell')
        # Extract model number
        model_match = re.search(r'(Inspiron|Insperon)\s+(\d+)', name)
        if model_match:
            asset_info['Dell Inspiron']['model'].add(f"Dell Inspiron {model_match.group(2)}")
        else:
            asset_info['Dell Inspiron']['model'].add('Dell Inspiron')
        asset_info['Dell Inspiron']['examples'].append(name)
    
    elif 'Dell Vostro' in name:
        asset_info['Dell Vostro']['type'].add('Laptop')
        asset_info['Dell Vostro']['brand'].add('Dell')
        asset_info['Dell Vostro']['model'].add('Dell Vostro')
        asset_info['Dell Vostro']['examples'].append(name)
    
    elif 'iPhone' in name or 'iphone' in name:
        asset_info['iPhone']['type'].add('Mobile')
        asset_info['iPhone']['brand'].add('Apple')
        # Extract iPhone model
        model_match = re.search(r'iPhone\s*(\d+\w*|\w+)', name, re.IGNORECASE)
        if model_match:
            asset_info['iPhone']['model'].add(f"iPhone {model_match.group(1)}")
        else:
            asset_info['iPhone']['model'].add('iPhone')
        asset_info['iPhone']['examples'].append(name)
    
    elif 'iPad' in name:
        asset_info['iPad']['type'].add('Tablet')
        asset_info['iPad']['brand'].add('Apple')
        if 'Mini' in name:
            asset_info['iPad']['model'].add('iPad Mini')
        else:
            asset_info['iPad']['model'].add('iPad')
        asset_info['iPad']['examples'].append(name)
    
    elif 'Mac Mini' in name or 'iMac' in name:
        if 'Mini' in name:
            asset_info['Mac Mini']['type'].add('Desktop')
            asset_info['Mac Mini']['brand'].add('Apple')
            asset_info['Mac Mini']['model'].add('Mac Mini')
            asset_info['Mac Mini']['examples'].append(name)
        else:
            asset_info['iMac']['type'].add('Desktop')
            asset_info['iMac']['brand'].add('Apple')
            asset_info['iMac']['model'].add('iMac')
            asset_info['iMac']['examples'].append(name)
    
    elif 'Samsung' in name:
        if 'Galaxy' in name or 'Grand' in name:
            asset_info['Samsung Mobile']['type'].add('Mobile')
            asset_info['Samsung Mobile']['brand'].add('Samsung')
            asset_info['Samsung Mobile']['model'].add('Samsung Galaxy')
            asset_info['Samsung Mobile']['examples'].append(name)
        elif 'Printer' in name:
            asset_info['Samsung Printer']['type'].add('Printer')
            asset_info['Samsung Printer']['brand'].add('Samsung')
            asset_info['Samsung Printer']['model'].add('Samsung Printer')
            asset_info['Samsung Printer']['examples'].append(name)
    
    elif 'Sony' in name or 'Vaio' in name:
        asset_info['Sony Vaio']['type'].add('Laptop')
        asset_info['Sony Vaio']['brand'].add('Sony')
        asset_info['Sony Vaio']['model'].add('Sony Vaio')
        asset_info['Sony Vaio']['examples'].append(name)
    
    elif 'Asus' in name or 'ASUS' in name:
        asset_info['Asus Laptop']['type'].add('Laptop')
        asset_info['Asus Laptop']['brand'].add('Asus')
        asset_info['Asus Laptop']['model'].add('Asus Laptop')
        asset_info['Asus Laptop']['examples'].append(name)
    
    elif 'Display' in name or 'Monitor' in name:
        if 'Dell' in name:
            asset_info['Dell Monitor']['type'].add('Monitor')
            asset_info['Dell Monitor']['brand'].add('Dell')
            asset_info['Dell Monitor']['model'].add('Dell Display')
            asset_info['Dell Monitor']['examples'].append(name)
        else:
            asset_info['Monitor']['type'].add('Monitor')
            asset_info['Monitor']['brand'].add('Generic')
            asset_info['Monitor']['model'].add('Monitor')
            asset_info['Monitor']['examples'].append(name)
    
    elif 'Keyboard' in name or 'keyboard' in name:
        if 'Apple' in name:
            asset_info['Apple Keyboard']['type'].add('Keyboard')
            asset_info['Apple Keyboard']['brand'].add('Apple')
            asset_info['Apple Keyboard']['model'].add('Apple Keyboard')
            asset_info['Apple Keyboard']['examples'].append(name)
    
    elif 'Mouse' in name or 'mouse' in name or 'MOUSE' in name:
        if 'Dell' in name or 'USB' in name:
            asset_info['Dell Mouse']['type'].add('Mouse')
            asset_info['Dell Mouse']['brand'].add('Dell')
            asset_info['Dell Mouse']['model'].add('Dell USB Mouse')
            asset_info['Dell Mouse']['examples'].append(name)
        elif 'Apple' in name:
            asset_info['Apple Mouse']['type'].add('Mouse')
            asset_info['Apple Mouse']['brand'].add('Apple')
            asset_info['Apple Mouse']['model'].add('Apple Mouse')
            asset_info['Apple Mouse']['examples'].append(name)
    
    elif 'Nexus' in name or 'NEXUS' in name:
        asset_info['Google Nexus']['type'].add('Mobile')
        asset_info['Google Nexus']['brand'].add('Google')
        model_match = re.search(r'Nexus\s*(\d+\w*)', name, re.IGNORECASE)
        if model_match:
            asset_info['Google Nexus']['model'].add(f"Nexus {model_match.group(1)}")
        asset_info['Google Nexus']['examples'].append(name)
    
    elif 'Lenovo' in name or 'LENOVO' in name:
        asset_info['Lenovo']['type'].add('Desktop')
        asset_info['Lenovo']['brand'].add('Lenovo')
        asset_info['Lenovo']['model'].add('Lenovo Desktop')
        asset_info['Lenovo']['examples'].append(name)
    
    elif 'Nokia' in name or 'Lumia' in name:
        asset_info['Nokia']['type'].add('Mobile')
        asset_info['Nokia']['brand'].add('Nokia')
        asset_info['Nokia']['model'].add('Nokia Lumia')
        asset_info['Nokia']['examples'].append(name)
    
    elif 'Motorola' in name or 'Moto' in name:
        asset_info['Motorola']['type'].add('Mobile')
        asset_info['Motorola']['brand'].add('Motorola')
        asset_info['Motorola']['model'].add('Motorola Moto')
        asset_info['Motorola']['examples'].append(name)
    
    elif 'Router' in name or 'ROUTER' in name or 'Wireless' in name or 'Airport' in name:
        if 'Apple' in name or 'Airport' in name:
            asset_info['Apple Router']['type'].add('Router')
            asset_info['Apple Router']['brand'].add('Apple')
            asset_info['Apple Router']['model'].add('Apple Airport Express')
            asset_info['Apple Router']['examples'].append(name)
        elif 'Cisco' in name or 'CISCO' in name:
            asset_info['Cisco Router']['type'].add('Router')
            asset_info['Cisco Router']['brand'].add('Cisco')
            asset_info['Cisco Router']['model'].add('Cisco Router')
            asset_info['Cisco Router']['examples'].append(name)
        elif 'Ruckus' in name or 'RUCKUS' in name:
            asset_info['Ruckus Router']['type'].add('Router')
            asset_info['Ruckus Router']['brand'].add('Ruckus')
            asset_info['Ruckus Router']['model'].add('Ruckus Wireless')
            asset_info['Ruckus Router']['examples'].append(name)
        elif 'BELKIN' in name or 'Belkin' in name:
            asset_info['Belkin Router']['type'].add('Router')
            asset_info['Belkin Router']['brand'].add('Belkin')
            asset_info['Belkin Router']['model'].add('Belkin Router')
            asset_info['Belkin Router']['examples'].append(name)
    
    elif 'Apple TV' in name or 'APPLE TV' in name:
        asset_info['Apple TV']['type'].add('Streaming Device')
        asset_info['Apple TV']['brand'].add('Apple')
        asset_info['Apple TV']['model'].add('Apple TV')
        asset_info['Apple TV']['examples'].append(name)
    
    elif 'iPod' in name:
        asset_info['iPod']['type'].add('Media Player')
        asset_info['iPod']['brand'].add('Apple')
        asset_info['iPod']['model'].add('iPod Touch')
        asset_info['iPod']['examples'].append(name)
    
    elif 'Watch' in name or 'WATCH' in name:
        asset_info['Apple Watch']['type'].add('Wearable')
        asset_info['Apple Watch']['brand'].add('Apple')
        asset_info['Apple Watch']['model'].add('Apple Watch')
        asset_info['Apple Watch']['examples'].append(name)
    
    elif 'AC' in name or 'BLUE STAR' in name:
        asset_info['Air Conditioner']['type'].add('Air Conditioner')
        asset_info['Air Conditioner']['brand'].add('Blue Star')
        asset_info['Air Conditioner']['model'].add('Blue Star AC')
        asset_info['Air Conditioner']['examples'].append(name)
    
    elif 'HARD DRIVE' in name or 'Hard Drive' in name:
        asset_info['External HDD']['type'].add('Storage')
        asset_info['External HDD']['brand'].add('WD')
        asset_info['External HDD']['model'].add('WD External HDD')
        asset_info['External HDD']['examples'].append(name)
    
    elif 'POWER ADAPTER' in name or 'Charger' in name:
        asset_info['Power Adapter']['type'].add('Accessory')
        asset_info['Power Adapter']['brand'].add('Apple')
        asset_info['Power Adapter']['model'].add('Power Adapter')
        asset_info['Power Adapter']['examples'].append(name)
    
    elif 'Tablet' in name or 'Surface' in name:
        asset_info['Microsoft Surface']['type'].add('Tablet')
        asset_info['Microsoft Surface']['brand'].add('Microsoft')
        asset_info['Microsoft Surface']['model'].add('Microsoft Surface')
        asset_info['Microsoft Surface']['examples'].append(name)

# Print summary
print("\n=== ASSET ANALYSIS SUMMARY ===\n")
for key in sorted(asset_info.keys()):
    info = asset_info[key]
    print(f"\n{key}:")
    print(f"  Type: {', '.join(info['type'])}")
    print(f"  Brand: {', '.join(info['brand'])}")
    print(f"  Models: {', '.join(list(info['model'])[:3])}...")
    print(f"  Count: {len(info['examples'])} items")
    print(f"  Example: {info['examples'][0]}")

print(f"\n\nTotal unique asset categories: {len(asset_info)}")
