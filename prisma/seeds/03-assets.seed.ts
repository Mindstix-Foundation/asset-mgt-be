import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Load purchase data mapping from JSON file
const purchaseDataPath = path.join(__dirname, 'purchase-data-mapping.json');
let purchaseDataMapping: { [key: string]: { purchaseDate: string | null; purchaseCost: number | null } } = {};

try {
  const mappingContent = fs.readFileSync(purchaseDataPath, 'utf-8');
  purchaseDataMapping = JSON.parse(mappingContent);
  console.log(`✅ Loaded purchase data for ${Object.keys(purchaseDataMapping).length} assets`);
} catch (error) {
  console.warn('⚠️  Could not load purchase data mapping. Using null values for purchase data.');
}

/**
 * COMPREHENSIVE ASSET SEEDING WITH PROPER TYPES, BRANDS, MODELS & NOTES
 * 
 * This seed file includes (counts updated at runtime):
 * - Total assets: computed from assetsData
 * - Proper asset type classification:
 *   • Laptop: MacBook Pro (M1/M2/M3/M4), MacBook Air (M3/M4), Dell, Lenovo ThinkPad/ThinkBook, etc.
 *   • Mobile: iPhone, Samsung Galaxy (M35/M06/S21 FE 5G/A21s), Pixel, Redmi 13 5G, Motorola G35 5G, Poco, etc.
 *   • Monitor: Dell displays, Lenovo ThinkCentre Tiny-in-One 22 Gen3
 *   • Tablet: iPad, Surface
 *   • Accessory: Apple Pencil
 * 
 * - Correct brand assignment: Apple, Dell, Samsung, Google, Xiaomi, Nokia, Lenovo, Motorola
 * - Specific model identification (MacBook Pro 13" Retina, iPhone models incl. 15 Pro Max, Galaxy M30/M12/M35, Poco F4, etc.)
 * - Detailed notes/descriptions extracted from the master CSV
 * 
 * Data source mapping:
 * - Serial numbers: sid asset file - Sheet1.csv
 * - Detailed info: Copy of mindstix_assets - mindstix_assets(1).csv (lines 649-1410)
 * 
 * Asset Type Categorization:
 * - ALL iPhones → Mobile
 * - ALL Samsung Galaxy devices (S7, M12, M30, M35, Flip3) → Mobile
 * - ALL Pixel/Nexus devices → Mobile
 * - ALL Redmi/Poco devices (Redmi Note 12, Poco F4, etc.) → Mobile
 * - iPads, Surface → Tablet
 * - MacBooks, Dell Inspiron, Lenovo, Asus → Laptop
 * 
 * Brand/type distribution is printed after seeding based on the current assetsData.
 */

interface AssetData {
  serialNumber: string;
  assetType: string;
  brand: string;
  model: string;
  notes: string;
}

const assetsData: AssetData[] = [
  // Accessory (1 total)
  { serialNumber: 'HJFFX3QBJKM9', assetType: 'Accessory', brand: 'Apple', model: 'Apple Pencil', notes: 'APPLE PENCIL' },

  // Laptop (287 total - including M3/M4 MacBooks and ThinkPads)
  { serialNumber: 'FVFF80V7Q05Q', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 16GB 256GB' },
  { serialNumber: 'PF3Q9PCZ', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad P14s Gen 2', notes: 'P14s Gen 2 (Type 20VX, 20VY) Laptop (ThinkPad)' },
  { serialNumber: 'BELKIN ROUTER', assetType: 'Router', brand: 'Belkin', model: 'Belkin Wireless Router', notes: '' },
  { serialNumber: 'PNRWQ747X1', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO 14 INCH' },
  { serialNumber: 'C02G1ASMQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR' },
  { serialNumber: 'FVFF9BJ9Q05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 256GB' },
  { serialNumber: 'C02MK9GWFD56', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 15" Retina', notes: '15 Inch Retina / Quad-core i7 2.0 Ghz / 8GB / 256GB / Iris Pro Graphics / Apple Standard 1 Year Warranty' },
  { serialNumber: 'C02FF5G9MD6M', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 16 inch' },
  { serialNumber: 'C02Q4KVUFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb' },
  { serialNumber: 'C17V0MQ10G', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'T46W7FV32R', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO 14 INCH' },
  { serialNumber: 'HTWWGG9C4Q', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 14 Inch' },
  { serialNumber: 'FVFG5GXEQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO M1' },
  { serialNumber: 'G62X90NL71', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'FVFJ4TX9Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'C07JL0B0DY3G', assetType: 'Desktop', brand: 'Apple', model: 'Mac Mini', notes: 'Mac mini' },
  { serialNumber: 'RYW7CTP69Q', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'MN27X43JHQ', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro M3', notes: 'MacBook Pro M3 16GB 250GB' },
  { serialNumber: 'JR20PWKLGV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'C6DMXMGHHD', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air M4', notes: 'MacBook Air M4' },
  { serialNumber: 'PF3RKDCS', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad E14 Gen2', notes: 'Lenovo Thinkpad E14 Gen2' },
  { serialNumber: 'PG013U2J', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad E470', notes: 'HDD1TB/8GB/Black' },
  { serialNumber: 'KW619TR932', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air M3', notes: 'MacBook Air M3 16GB' },
  { serialNumber: 'FVFVV6T6J1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'FVFFRJXFQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO M1' },
  { serialNumber: 'FVFFRJT7Q05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO M1' },
  { serialNumber: 'C02V8DZDHV29', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD256GB/8GB' },
  { serialNumber: 'FVHXD6J3HV22', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'MP27J2J6', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 15', notes: 'Lenovo ThinkBook 15 Inch' },
  { serialNumber: 'C02STDU0GFL', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 15" Retina', notes: 'Space Grey/2.6GHz/16GB/Radeon 450/256 GB/Touch bar/2GB graphic card' },
  { serialNumber: 'MCXR2YG66T', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Macbook Pro A2779' },
  { serialNumber: 'H9FFXP4DWN', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 14 inch' },
  { serialNumber: 'FVFXN1Q4HV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'C02JMBPJQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'C02DXD66ML7H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro' },
  { serialNumber: 'FVFXKB6DHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '8GB/128GBSSD' },
  { serialNumber: '7294P32', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15', notes: 'Core i5/8GB/1TB/Windows8.1' },
  { serialNumber: 'F17W543AJCLY', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '64GB/BLACK' },
  { serialNumber: 'RZ8T50GA2NE', assetType: 'Mobile', brand: 'Samsung', model: 'Galaxy M12', notes: 'Samsung Galaxy M12' },
  { serialNumber: 'F3G9MC2', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 5559', notes: 'i5/8GB/1TB/WINDOWS 10/SILVER/WITH MS OFFICE' },
  { serialNumber: 'FVFKC54K1WFV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Lennar' },
  { serialNumber: 'C02PQQQLFVH5', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '13.3/2.7GHz/8GB/256GB' },
  { serialNumber: 'FVFFRJTPQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO M1' },
  { serialNumber: 'X6DQ4G7V2F', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 14 inch M1 Pro Chip' },
  { serialNumber: 'RR447QKV3X', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 14 inch' },
  { serialNumber: 'QGLQJ41CW0', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 14 Inch' },
  { serialNumber: 'FVFG19XXQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO M1' },
  { serialNumber: 'FVFFMBEVQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO' },
  { serialNumber: 'PF1PL6XH', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad L480', notes: 'SSD256/16GB/Black' },
  { serialNumber: 'C02G1UV8Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'FVFXDAG2HV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'FVHFW1GYQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO M1' },
  { serialNumber: 'C02G8M8KQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'MP27HQ3H', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 15', notes: 'Lenovo ThinkBook 15 Inch' },
  { serialNumber: 'C02KC2CWQ6L7', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'PF1PL6J4', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad L480', notes: 'SSD256/16GB/Black' },
  { serialNumber: 'FVHFW1HFQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO M1' },
  { serialNumber: 'MP24BQZ7', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 15', notes: 'Lenovo ThinkBook 15 Inch' },
  { serialNumber: 'MHG94T6HPH', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro M3', notes: 'MacBook Pro M3 18GB 500GB' },
  { serialNumber: 'FVFXN1QTHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro' },
  { serialNumber: 'FVHXJCF5J1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'R7MFDQVXW3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'PG015P24', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad E470', notes: '256SSD/8GB/Black' },
  { serialNumber: 'C02G8M3NQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'C02G8M5VQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'MVDWFYVNV9', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air M3', notes: 'MacBook Air M3' },
  { serialNumber: 'FVFVT74BJ1WL', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '13.3/1.8GHZ/8GB/256GB/I5' },
  { serialNumber: 'GTX2P6HDW5', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air M4', notes: 'MacBook Air M4' },
  { serialNumber: 'QQDWTV03LV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 14 Inch' },
  { serialNumber: 'C02Q4KUDFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb' },
  { serialNumber: 'C02L4AHVDR53', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '13inch Retina Dual-core i5 2.5 Ghz / 8GB / 128GB Flash / HD Graphics 4000 / 1 Year Standard Apple Warranty' },
  { serialNumber: 'FVFXJ1AMJ1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'FVFJ6AP81WFV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'C02KC2EWQ6L7', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Lennar' },
  { serialNumber: 'C02Q4KYRFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb' },
  { serialNumber: 'C5772C93VN', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'FVFFRJZ2Q05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO M1' },
  { serialNumber: 'FVFVFGRXJ1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '13.3/1.8GHZ/8GB/128GB' },
  { serialNumber: 'FVFKNS3T1WFV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Lennar' },
  { serialNumber: 'FVFKT6PN1WFV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Lennar' },
  { serialNumber: 'TXQ7W2M26R', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro A2338', notes: 'MacBook Pro, M2, 2023' },
  { serialNumber: 'FVFFRJV7Q05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO M1' },
  { serialNumber: 'C02JM9UFQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'V2TQ0HL49W', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 14 Inch' },
  { serialNumber: 'C02FFCW5Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR' },
  { serialNumber: 'MP28J2Z8', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 15', notes: 'Lenovo ThinkBook 15 Inch' },
  { serialNumber: 'LRFV3FT767', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air M3', notes: 'MacBook Air M3 16GB' },
  { serialNumber: 'C02G8W2LQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'HYXQ72MX19', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro M3', notes: 'MacBook Pro M3 18GB 500GB' },
  { serialNumber: 'FVFF80VFQ05Q', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'FVFFRJW4Q05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO M1' },
  { serialNumber: 'FVFF8FE7Q05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 256GB' },
  { serialNumber: 'FVFJ54JV1WFV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'C02G8WAHQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'C02G21ETML7H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO' },
  { serialNumber: 'FVFX52BUJ1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'C02DXD7QML7H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro' },
  { serialNumber: 'RC2CM94TF3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 14 inch' },
  { serialNumber: 'MP2639XH', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 14', notes: 'Lenovo ThinkBook 14 inch' },
  { serialNumber: 'C02JJ9JKQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air' },
  { serialNumber: 'FVFXF6UVHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128/8GB' },
  { serialNumber: 'FVFJ6N21WFV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'LY04WH9JFC', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air M3', notes: 'MacBook Air M3 8GB 500GB' },
  { serialNumber: 'C02G8VX9Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'FVFVD2ZGJ1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '13.3/1.8GHZ/8GB/128GB' },
  { serialNumber: 'MP263CF2', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 14', notes: 'Lenovo ThinkBook 14 inch' },
  { serialNumber: 'KWPXPP6WPX', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air M3', notes: 'MacBook Air M3 16GB' },
  { serialNumber: 'MP263A10', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'Lenovo Thinkbook' },
  { serialNumber: 'RYY4DXRD4H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 14 inch' },
  { serialNumber: 'HXVPY74729', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Macbook Pro A2779' },
  { serialNumber: 'R62FHPH0JN', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro A2338', notes: 'MacBook Pro, M2, 2023' },
  { serialNumber: 'C02JJ9EWQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Lennar' },
  { serialNumber: 'PG01CH5Q', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad E480', notes: '1TBHDD/8GB/Black' },
  { serialNumber: 'FVFJ564NQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'M0JMGGJ46R', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air M3', notes: 'MacBook Air M3 16GB' },
  { serialNumber: 'FVFF9BF4Q05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 256GB' },
  { serialNumber: 'C02JMATAQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'For Lennar' },
  { serialNumber: 'PF1PL6HR', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad L480', notes: 'SSD256/16GB/Black' },
  { serialNumber: 'PG01P2A8', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad E490', notes: 'SSD256/16GB/Black' },
  { serialNumber: 'RZCX71MB8AH', assetType: 'Mobile', brand: 'Samsung', model: 'Galaxy S21 FE 5G', notes: 'Samsung Galaxy S21 FE 5G - IMEI:350896234159587/358943154159585, Model: SM-G990B2/DS' },
  { serialNumber: 'C02JMA0RQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'FVFJQJGN1WFV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Lennar' },
  { serialNumber: 'C02G7BRCML7H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO 16GB' },
  { serialNumber: 'R4KJXD39H3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 14 inch' },
  { serialNumber: 'TDQH62WT07', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro A2338', notes: 'MacBook Pro, M2, 2023' },
  { serialNumber: 'D9K4R3D2TP', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air M4', notes: 'MacBook Air M4' },
  { serialNumber: 'MP27HQ6M', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 15', notes: 'Lenovo ThinkBook 15 Inch' },
  { serialNumber: 'MP262JY2', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 14', notes: 'Lenovo ThinkBook 14 inch' },
  { serialNumber: 'C02JMBPVQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'C02JGR1YQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'C02JMBNKQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'T9XHJ6VJKH', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro A2338', notes: 'MacBook Pro, M2, 2023' },
  { serialNumber: 'D9DJJYCVWX', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air M4', notes: 'MacBook Air M4' },
  { serialNumber: 'MP263CAC', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 14', notes: 'Lenovo ThinkBook 14 inch' },
  { serialNumber: 'MP2637MS', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 14', notes: 'Lenovo ThinkBook 14 inch' },
  { serialNumber: 'PF58K4XS', assetType: 'Laptop', brand: 'Lenovo', model: 'Lenovo ThinkPad', notes: 'Lenovo ThinkPad' },
  { serialNumber: 'C02JMBPFQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Lennar' },
  { serialNumber: 'MP28J32S', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 15', notes: 'Lenovo ThinkBook 15 inch' },
  { serialNumber: 'PG02KF95', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: '' },
  { serialNumber: 'C02JMBPAQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Macbook Air A2337' },
  { serialNumber: 'C02FFCURQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR' },
  { serialNumber: 'FVFJ6J511WFV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'PF3Q9B36', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad P14s Gen 2', notes: 'P14s Gen 2 (Type 20VX, 20VY) Laptop (ThinkPad)' },
  { serialNumber: 'KJ2096H79W', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro M3', notes: 'MacBook Pro M3 16GB 250GB' },
  { serialNumber: 'MP2637S2', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'LENOVO THINKBOOK' },
  { serialNumber: 'MP28J31Y', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 15', notes: 'Lenovo ThinkBook 15 Inch' },
  { serialNumber: 'LY74GQXWJ1', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air M3', notes: 'MacBook Air M3' },
  { serialNumber: 'C17FX04BQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'C02G8MA1Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'C02JM9EEQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'C02KC2E9Q6L7', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Lennar' },
  { serialNumber: 'C9TWV1WVYD', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'FVFJ6JFE1WFV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MAcBook Air M1' },
  { serialNumber: 'C02KC2EUQ6L7', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Lennar' },
  { serialNumber: 'MP263A74', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 14 G2 ITL', notes: 'ThinkBook 14 G2 ITL Laptop - Type 20VD' },
  { serialNumber: 'MP2637NP', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'LENOVO THINKBOOK' },
  { serialNumber: 'FVFFLPFBQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'MP22CSK8', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'ThinkBook 16 GB' },
  { serialNumber: 'MP263A6K', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 14', notes: 'Lenovo ThinkBook 14 inch' },
  { serialNumber: 'MY9WH1W9K7', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'FVFFMARYQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO M1' },
  { serialNumber: 'N4W7FNJKW7', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro M2' },
  { serialNumber: 'C02G8W1CQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'C02JMA1DQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'C02JMBQWQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'MP25X01S', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 14', notes: 'Lenovo ThinkBook 14 inch' },
  { serialNumber: 'PG02KF8V', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: '' },
  { serialNumber: 'C02G8ME8Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'FVFY84XLHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'MK2NLXLJ60', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Macbook Pro A2779' },
  { serialNumber: 'HFRJPFP4F9', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO 14 INCH' },
  { serialNumber: 'C02F50TUML7H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO' },
  { serialNumber: 'C02DVDBPML7H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro' },
  { serialNumber: 'FVHFW1CUQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Apple MacBook Pro M1 8GB' },
  { serialNumber: 'FVFFF56JQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO' },
  { serialNumber: 'FVFX6BM0HV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO' },
  { serialNumber: 'C02V2HTHHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Silver/2.3Ghz/8GB/128GB' },
  { serialNumber: 'PF58WMLA', assetType: 'Laptop', brand: 'Lenovo', model: 'Lenovo ThinkPad', notes: 'Lenovo ThinkPad' },
  { serialNumber: 'PG02KF8G', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: '' },
  { serialNumber: 'X307064YGW', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 14 Inch' },
  { serialNumber: 'FVFFM0CNQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO M1' },
  { serialNumber: 'J930JFJJTC', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 14 Inch' },
  { serialNumber: 'MP2639X9', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'LENOVO THINKBOOK' },
  { serialNumber: 'FVHW69NWJ1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '13.3/1.8GHZ/8GB/128GB' },
  { serialNumber: 'C02F8DSFQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'C02F8DS4Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'C02FW7QGMD6M', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO 16' },
  { serialNumber: 'C02JMBQXQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'FVFFRJWFQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO M1' },
  { serialNumber: 'FVHFW1M2Q05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO M1' },
  { serialNumber: 'PG01FY21', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad E480', notes: '256SSD/16GB/Black' },
  { serialNumber: 'C02JMBS7Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'C02G8M3VQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'C17G59KAQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'C02G8M5MQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'FVFG2FCQQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO M1' },
  { serialNumber: 'FVFXDAJQHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'PG02KF4Z', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: '' },
  { serialNumber: 'C02G1ALFQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR' },
  { serialNumber: 'L43CFL6LR0', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air M3', notes: 'MacBook Air M3' },
  { serialNumber: 'MP28PT9Q', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 15', notes: 'Lenovo ThinkBook 15 inch' },
  { serialNumber: 'TFXWR630H4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'XJ0K62H6GF', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 14 Inch' },
  { serialNumber: 'C02G8M27Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'KW7HQVX5M7', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air M3', notes: 'MacBook Air M3 16GB' },
  { serialNumber: 'MP263CG4', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'LENOVO THINKBOOK' },
  { serialNumber: 'FVHXG6ESHV29', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro' },
  { serialNumber: 'C02JJ9K5Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'MP263FGV', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'LENOVO THINKBOOK' },
  { serialNumber: 'MP24BPDC', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 15', notes: 'Lenovo ThinkBook 15 inch' },
  { serialNumber: 'MP263A16', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 14', notes: 'Lenovo ThinkBook 14 inch' },
  { serialNumber: 'C02G8AQ6ML7H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO 16GB' },
  { serialNumber: 'FVFFMBBZQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO' },
  { serialNumber: 'C02KCDVHQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Lennar' },
  { serialNumber: 'PF3W96XX', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad E14 Gen2', notes: 'Lenovo Thinkpad E14 Gen 2' },
  { serialNumber: 'PG02KESE', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: '' },
  { serialNumber: 'R9ZY30G0X2T', assetType: 'Mobile', brand: 'Samsung', model: 'Galaxy M06 5G', notes: 'Samsung Galaxy M06 5G - Model: SM-M066B/DS, IMEI:350160040489153/351989660489153' },
  { serialNumber: 'Q2YF2R6W2M', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'PF1ES933', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad L480', notes: '256SSD/16GB/Black' },
  { serialNumber: 'C02JMA1YQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'PG01GMWA', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad E480', notes: '256SSD/16GB/Black' },
  { serialNumber: 'C02MDFSVFH00', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '13 Inch Retina / Dual-core i5 2.4 Ghz / 8GB / 256GB Flash / HD Graphics 4000 / 1 Year Standard Apple Warranty/ Got Logic Board replaced on 1/8/2016 with 3 month warranty.' },
  { serialNumber: 'PG02KF7E', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: '' },
  { serialNumber: 'MP263CFL', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 14', notes: 'Lenovo ThinkBook 14 Inch' },
  { serialNumber: 'MP263AOP', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 14', notes: '' },
  { serialNumber: 'C02D97TDML7L', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro A2251' },
  { serialNumber: 'C02JMBPZQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'As Per the Assets Management Tracker' },
  { serialNumber: 'FVFJ6GN21WFV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'MP24BV67', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 15', notes: 'Lenovo ThinkBook 15 Inch' },
  { serialNumber: 'KNA02QIG', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'Lennovo Think book' },
  { serialNumber: 'FVFF9BXPQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 256 GB' },
  { serialNumber: '10R09704', assetType: 'Monitor', brand: 'Lenovo', model: 'ThinkCentre Tiny-in-One 22 Gen3', notes: 'ThinkCentre Tiny-in-One 22 Gen3 - Type 10R0' },
  { serialNumber: 'PF0X2TAH', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad L470', notes: 'L470 (type 20J4, 20J5) Laptop (ThinkPad)' },
  { serialNumber: 'FVFXP23UJK78', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD256GB/8GB' },
  { serialNumber: 'C02DM29CML7H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro' },
  { serialNumber: 'PG01P77B', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad E490', notes: 'Lenovo ThinkPad E490' },
  { serialNumber: 'MP24BQ27', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 15', notes: '' },
  { serialNumber: 'MP27HVQ9', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 15', notes: 'Lenovo ThinkBook 15 Inch' },
  { serialNumber: 'RZ8T61E8H2X', assetType: 'Mobile', brand: 'Samsung', model: 'Galaxy M12', notes: 'Samsung Galaxy M12' },
  { serialNumber: 'C02JM9CSQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'MP27JBK5', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 16', notes: 'Lenovo ThinkBook 16 inch' },
  { serialNumber: 'HKGH2WG147', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro M4', notes: 'MacBook Pro M4 16GB' },
  { serialNumber: 'PG01FY2G', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad E480', notes: 'Lenovo Thinkpad E480' },
  { serialNumber: 'PF58YTLG', assetType: 'Laptop', brand: 'Lenovo', model: 'Lenovo ThinkPad', notes: 'Lenovo ThinkPad' },
  { serialNumber: 'C02T7D9JGVC1', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO' },
  { serialNumber: 'PG01GMUJ', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad E480', notes: '256SSD/16GB/Black' },
  { serialNumber: 'FVFXP0S7HV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128/8GB' },
  { serialNumber: 'L7G91377N2', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro M4', notes: 'MacBook Pro M4 16GB' },
  { serialNumber: 'PG01DZDP', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad E480', notes: '256SSD/8GB/Black' },
  { serialNumber: 'MP27HSEP', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 15', notes: 'Lenovo ThinkBook 15 Inch' },
  { serialNumber: 'MP263A1J', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 14', notes: 'Lenovo ThinkBook 14 Inch 40 GB' },
  { serialNumber: 'MMQ4JJJ4D6', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 14 Inch' },
  { serialNumber: 'C5YY2JQ4TF', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air M4', notes: 'MacBook Air M4' },
  { serialNumber: 'FVFZ87CGJ1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '128SSD/8GB' },
  { serialNumber: 'FVFXN1PEHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'LV4P56XRY0', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air M3', notes: 'MacBook Air M3 16GB' },
  { serialNumber: 'MP263CCV', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'LENOVO THINKBOOK' },
  { serialNumber: 'RZ8T61E82BJ', assetType: 'Mobile', brand: 'Samsung', model: 'Samsung Phone', notes: '' },
  { serialNumber: 'C02T7C4YFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb' },
  { serialNumber: 'MP26A47W', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 14', notes: 'Lenovo ThinkBook 14 inch' },
  { serialNumber: 'FVFXN3EVHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'C02Q4L1JFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb' },
  { serialNumber: 'MP28PT90', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 15', notes: 'Lenovo ThinkBook 15 Inch' },
  { serialNumber: 'NCQ0HJ75LQ', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro M2' },
  { serialNumber: 'C02T88JSFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb' },
  { serialNumber: 'C02T3KLVFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb/keyboard and mouse Problem' },
  { serialNumber: 'FVFXP0TGHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'C02DCPTBML7H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '16GB/500GBSSD' },
  { serialNumber: 'C02JH7TYQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'FVFXN1RHHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'FVFKT6HT1WFV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Lennar' },
  { serialNumber: 'PF1Q48D4', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad E480', notes: 'SSD256GB/16GB/Black' },
  { serialNumber: 'C02FD237ML7H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO' },
  { serialNumber: 'FVFZ3FGML40Y', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'NH4H5KX9LM', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro M2' },
  { serialNumber: 'C02HK45QJR9V', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'PF1M6BT7', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad L480', notes: '256SSD/8GB/Black' },
  { serialNumber: 'C02JJ9K3Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'MJ0FPFXE', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad X1', notes: 'Lenovo Thinkpad X1' },
  { serialNumber: 'C02JMBPLQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'MP263A0H', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 14', notes: 'Lenovo ThinkBook 14 Inch' },
  // NEW LAPTOP ASSETS
  { serialNumber: 'M7PVXLGJ2G', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air M3', notes: 'MacBook Air M3' },
  { serialNumber: 'L2DN7C14DW', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro M3', notes: 'MacBook Pro M3 18GB 500GB' },
  { serialNumber: 'KXVDCLQ336', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro M4', notes: 'MacBook Pro M4 16GB' },
  { serialNumber: 'PF58GNC7', assetType: 'Laptop', brand: 'Lenovo', model: 'Lenovo ThinkPad', notes: 'Lenovo ThinkPad' },
  { serialNumber: 'PF58WS4Z', assetType: 'Laptop', brand: 'Lenovo', model: 'Lenovo ThinkPad', notes: 'Lenovo ThinkPad' },
  // NEWLY ADDED ASSETS FROM UPDATED CSV
  { serialNumber: 'C02JMBQ7Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air M1', notes: 'MacBook Air M1' },
  { serialNumber: 'FVFXKB6GHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'KNA02QIG1', assetType: 'Laptop', brand: 'Lenovo', model: 'Lenovo ThinkPad', notes: 'Lenovo ThinkPad 15 Inch' },
  { serialNumber: 'MP24BWTM', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 15', notes: 'Lenovo ThinkBook 15 Inch' },
  { serialNumber: 'PF3Y0WEL', assetType: 'Laptop', brand: 'Lenovo', model: 'Lenovo ThinkPad', notes: 'Lenovo ThinkPad 15 Inch' },
  // NEW ASSETS - ADDITIONAL 18 ASSETS (16 Lenovo + 2 Mac + 1 iPhone)
  { serialNumber: 'PG0105R9', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad E470', notes: 'E470 Laptop (ThinkPad)' },
  { serialNumber: 'FVFXQG04J1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro A1708', notes: 'Macbook Pro A1708' },
  { serialNumber: 'PG0237DT', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad E14', notes: 'E14 (Type 20RA, 20RB) Laptop (ThinkPad)' },
  { serialNumber: 'PG027306', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad L14', notes: 'L14 (type 20U1, 20U2) Laptops (ThinkPad)' },
  { serialNumber: 'FVFX80MHJ1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro A1708', notes: 'Macbook Pro A1708' },
  { serialNumber: 'PG013U1X', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad E470', notes: 'E470 Laptop (ThinkPad)' },
  { serialNumber: 'PG013U0U', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad E470', notes: 'E470 Laptop (ThinkPad)' },
  { serialNumber: 'PF3TVT5N', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad P14s Gen 2', notes: 'P14s Gen 2 (Type 20VX, 20VY) Laptop (ThinkPad)' },
  { serialNumber: 'PF1ES56S', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad L480', notes: 'L480 (type 20LS, 20LT) Laptops (ThinkPad)' },
  { serialNumber: 'PG01CH60', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad E480', notes: 'E480 (Type 20KN, 20KQ) Laptop (ThinkPad)' },
  { serialNumber: 'PG01P76N', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad E490', notes: 'E490 (Type 20N8, 20N9) Laptop (ThinkPad)' },
  { serialNumber: 'PG0272YJ', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad L14', notes: 'L14 (type 20U1, 20U2) Laptops (ThinkPad)' },
  { serialNumber: 'PG02KES7', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 14 G2 ITL', notes: 'ThinkBook 14 G2 ITL' },
  { serialNumber: 'PG02730S', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad L14', notes: 'L14 (type 20U1, 20U2) Laptops (ThinkPad)' },
  { serialNumber: 'L73J7LC253', assetType: 'Mobile', brand: 'Apple', model: 'iPhone 6', notes: 'IPHONE 6' },
  { serialNumber: 'PG01CH4Z', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad E480', notes: 'E480 (Type 20KN, 20KQ) Laptop (ThinkPad)' },
  { serialNumber: 'PG02KE57', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad L14 Gen 2', notes: 'L14 Gen 2 Type 20X1 20X2 Laptops (ThinkPad)' },
  { serialNumber: 'PG013U5C', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad E470', notes: 'E470 Laptop (ThinkPad)' },
  { serialNumber: 'GCCV712ZJ1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air 13"', notes: '13.3/1.8GHZ/8GB/128GB' },
  // ADDITIONAL 4 ASSETS FROM CSV
  { serialNumber: 'TNW59NDXDC', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro M2', notes: 'Macbook Pro, M2, 2023' },
  { serialNumber: 'C17R90QFFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb' },
  { serialNumber: 'C02F20FLML7H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro' },
  { serialNumber: 'C02G47D0ML7H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MACBOOK PRO' },
  { serialNumber: 'PG011WES', assetType: 'Laptop', brand: 'Lenovo', model: 'Lenovo ThinkPad', notes: 'ThinkPad L470' },
  { serialNumber: 'C02VMOJOHV2D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro A1398' },
  { serialNumber: 'PG01FXW0', assetType: 'Laptop', brand: 'Lenovo', model: 'Lenovo ThinkPad', notes: 'ThinkPad E470' },
  { serialNumber: 'PF1MBBT7', assetType: 'Laptop', brand: 'Lenovo', model: 'Lenovo ThinkPad', notes: 'ThinkPad L480' },
  // ASSETS FROM MASTER CSV (Lines 649-1410) - 89 additional assets
  { serialNumber: 'FVFVT748J1WL', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'SSD256GB/8GB' },
  { serialNumber: 'FVFWTANCJ1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'SSD128GB/8GB' },
  { serialNumber: 'FVHX2NYYJ1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'SSD128GB/8GB' },
  { serialNumber: 'C02Q4KXWFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb' },
  { serialNumber: 'C02T2NL2FVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb/keyboard and mouse Problem' },
  { serialNumber: 'FVFFLP5SQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'FVFX5SVAJ1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'SSD128GB/8GB' },
  { serialNumber: 'C02TM0LVFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb' },
  { serialNumber: 'FVHZ1B8TJ1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'SSD128GB/8GB' },
  { serialNumber: 'C02Q4TSJFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb' },
  { serialNumber: 'MP27J0FC', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 15', notes: '' },
  { serialNumber: 'PG0273FS', assetType: 'Laptop', brand: 'Lenovo', model: 'Lenovo ThinkPad', notes: '644' },
  { serialNumber: 'FVFXQJL2J1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'SSD128GB/8GB' },
  { serialNumber: 'MP22F6S0', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 15', notes: '' },
  { serialNumber: 'MP22F48C', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 15', notes: '' },
  { serialNumber: 'C02TF2SKFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb' },
  { serialNumber: 'C02P4HH0G3QH', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '13.3inc/2.6GHz/8GB/128GB' },
  { serialNumber: 'FVHW6BN4J1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'SSD128GB/8GB' },
  { serialNumber: 'C02ZQ0A5MD6P', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD512GB/16GBRAM' },
  { serialNumber: 'FVFWKRWZJ1WL', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'SSD256GB/8GB' },
  { serialNumber: 'C02TP8VFFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'C02P33VGG3QH', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '13.3/2.6GHz/8GB/128GB' },
  { serialNumber: 'C17D920HML7H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '16GB/500GBSSD' },
  { serialNumber: 'C17N5710G3QJ', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '13 Inch Retina / Dual-core i5 2.6 Ghz / 8GB / 256GB / Iris Graphics' },
  { serialNumber: 'C17N578FG3QJ', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '13 Inch Retina / Dual-core i5 2.6 Ghz / 8GB / 256GB / Iris Graphics / Apple Standard 1 Year Warranty / Laptop Back Panel Problem' },
  { serialNumber: 'FVFV5YU8J1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: '13.3/1.8GHZ/8GB/128GB' },
  { serialNumber: 'FVFZ5LYTJ1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: '' },
  { serialNumber: 'C02Q4X2BFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb/Keyboard Problem' },
  { serialNumber: 'FVFXJ7DXJ1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'SSD128GB/8GB' },
  { serialNumber: 'FVFXN1QCHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'C02T7C5QFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '13.3/2.75GHz/8GB/128GB' },
  { serialNumber: 'FVFY21V4HV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'MP263C6R', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 15', notes: '' },
  { serialNumber: 'C02KC2FNQ6L7', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'For Lennar' },
  { serialNumber: 'MP22CN4C', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 15', notes: '' },
  { serialNumber: 'FVHXD6RJHV22', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'MP263A0P', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 15', notes: '' },
  { serialNumber: 'FVFXP0SDHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'FVFXDAEMHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'C02TJ0J6GVC1', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Space Grey 13.3/2GHz/8GB/256GB' },
  { serialNumber: 'C1MSK17QDTY3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '13 INC/Core i5 / 4GB / 500GB' },
  { serialNumber: 'PF3WNKPN', assetType: 'Laptop', brand: 'Lenovo', model: 'Lenovo ThinkPad', notes: '' },
  { serialNumber: 'PG013UEE', assetType: 'Laptop', brand: 'Lenovo', model: 'Lenovo ThinkPad', notes: '' },
  { serialNumber: '5CG1256SJR', assetType: 'Laptop', brand: 'HP', model: 'HP Laptop', notes: '' },
  { serialNumber: 'MP24BT3W', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 15', notes: '' },
  { serialNumber: 'C02T74HVFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb' },
  { serialNumber: 'C17R90QNFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '13.3/2.75GHz/8GB/128GB' },
  { serialNumber: 'C1MKV9R7DTY3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Core i5 / 8GB / 250GB / OSX / Apple Protection Plan Expires 10th July 2015' },
  { serialNumber: 'FVHX2AXSJ1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'SSD128GB/8GB' },
  { serialNumber: 'C02FW8HBMD6M', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'C02T4173FVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '13.3/2.75GHz/8GB/128GB' },
  { serialNumber: 'PG012MYU', assetType: 'Laptop', brand: 'Lenovo', model: 'Lenovo ThinkPad', notes: '8GB/256SSD/WIN-10 PRO/i5' },
  { serialNumber: 'FVFXQG06J1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'SSD128GB/8GB' },
  { serialNumber: 'C02PQXA4FVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '13 INC/2.7 GHZ/8GB/128 GB' },
  { serialNumber: 'FVHWLGJFJ1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'SSD128GB/8GB' },
  { serialNumber: 'FVFTK4M2H3QD', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: '13.3/1.6GHZ/8GB/128GB' },
  { serialNumber: 'FVHX2B26J1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'SSD128GB/8GB' },
  { serialNumber: 'FVFXDADHHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '128GBSSD/8GBRAM' },
  { serialNumber: 'FVFXF6UWHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'FVFXP0SHHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'FVHXGFWQJ1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'SSD128GB/8GB' },
  { serialNumber: 'FVHTVNMZJ1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: '13.3/1.8GHZ/8GB/128GB' },
  { serialNumber: 'C02S9ZRNFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb' },
  { serialNumber: 'C02T7CDYFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb' },
  { serialNumber: 'C02PJ2S5FVH5', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '13.3/2.7GHZ/8GB/256GB/Display Damage' },
  { serialNumber: 'C02S5DNLFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb' },
  { serialNumber: 'C1MS70AGDTY3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '13 INC/Core i5 / 8GB / 500GB' },
  { serialNumber: 'C17S907ZFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb' },
  { serialNumber: 'FVFV4DPZJ1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: '13.3/1.8GHZ/8GB/128GB' },
  { serialNumber: 'C02Q4KQSFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb/keyboard and mouse Problem' },
  { serialNumber: 'C1MSM2FSDTY3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '13 INC/Core i5 / 8GB / 500GB' },
  { serialNumber: 'C17N571MG3QJ', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '13 Inch Retina / Dual-core i5 2.6 Ghz / 8GB / 256GB / Iris Graphics / Apple Standard 1 Year Warranty' },
  { serialNumber: 'C17PD2HDFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc 13/2.7GHz/8GB/128Gb' },
  { serialNumber: 'C02Q4KUCFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb' },
  { serialNumber: 'C02MK4E6FH00', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '13 Inch Retina / Dual-core i5 2.4 Ghz / 8GB / 256GB Flash / HD Graphics 4000 / 1 Year Standard Apple Warranty / Keyboard and Charing Port Problem' },
  { serialNumber: 'C02T75DUFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb' },
  { serialNumber: 'FVFXJ2T2J1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'SSD128GB/8GB' },
  { serialNumber: 'FVFVQ4NRJ1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: '13.3/1.8GHZ/8GB/128GB' },
  { serialNumber: 'C02Q4DEGFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb/Motherboard Problem' },
  { serialNumber: 'C02L4A12DR53', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '13inch Retina Dual-core i5 2.5 Ghz / 8GB / 128GB Flash / HD Graphics 4000 / 1 Year Standard Apple Warranty' },
  { serialNumber: 'FVFXJUU0J1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'SSD128GB/8GB' },
  { serialNumber: 'C17RR7PTFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb' },
  { serialNumber: 'C02NGJNPG3QJ', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '13inch/ i5 2.6 Ghz' },
  { serialNumber: 'C02RM1LFFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb' },
  { serialNumber: 'C17S900SFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb' },
  { serialNumber: 'C02S5DJ8FVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb' },
  { serialNumber: 'FVFVT71TJ1WL', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'SSD256GB/8GB' },
  { serialNumber: 'FVHW6BKVJ1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: '13.3/1.8GHZ/8GB/128GB' },
  { serialNumber: 'C17S907RFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb' },
  { serialNumber: 'C02G8ARWML7H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'FVFWKFL9HV2', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'MP263C98', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 15', notes: '' },

  // Mobile (30 total - including Samsung M35/M06/S21 FE 5G, Redmi 13 5G, Moto G35 5G)
  { serialNumber: 'F5MQWRWF6R', assetType: 'Mobile', brand: 'Apple', model: 'iPhone 15 Pro Max', notes: '' },
  { serialNumber: 'FK1XG1NSKPHG', assetType: 'Mobile', brand: 'Apple', model: 'iPhone XS Max', notes: '' },
  { serialNumber: 'FDJ7GXDWWN', assetType: 'Mobile', brand: 'Apple', model: 'iPhone 16e', notes: '' },
  { serialNumber: '803KPBF1689341', assetType: 'Mobile', brand: 'Google', model: 'Pixel 2 XL', notes: '' },
  { serialNumber: 'F17CV4JYN6Y5', assetType: 'Mobile', brand: 'Apple', model: 'iPhone 11 Pro', notes: '64GB' },
  { serialNumber: 'e425d35c', assetType: 'Mobile', brand: 'Xiaomi', model: 'Poco F4', notes: '' },
  { serialNumber: 'G0NVQ50VJCLF', assetType: 'Mobile', brand: 'Apple', model: 'iPhone X', notes: '' },
  { serialNumber: 'RZ8MC0AXM1W', assetType: 'Mobile', brand: 'Samsung', model: 'Galaxy M30', notes: '4/64GB' },
  { serialNumber: 'DX3H53XRN735', assetType: 'Mobile', brand: 'Apple', model: 'iPhone 11', notes: '' },
  { serialNumber: 'b168bc8d1222', assetType: 'Mobile', brand: 'Xiaomi', model: 'Redmi Note 12 5G', notes: '' },
  { serialNumber: 'RZ8T61DMPCB', assetType: 'Mobile', brand: 'Samsung', model: 'Galaxy M12', notes: 'Samsung Galaxy M12' },
  { serialNumber: 'RZ8N7023H0Z', assetType: 'Mobile', brand: 'Samsung', model: 'Galaxy A21s', notes: '' },
  { serialNumber: '4465AEC8', assetType: 'Mobile', brand: 'Xiaomi', model: 'Redmi Note 9 Pro Max', notes: '' },
  { serialNumber: '5LKR99LR0ZNBOZTC', assetType: 'Mobile', brand: 'Xiaomi', model: 'Redmi Note 10S', notes: '' },
  { serialNumber: 'F4DWJ7RQ0Q', assetType: 'Mobile', brand: 'Apple', model: 'iPhone 13 mini', notes: '' },
  { serialNumber: 'CVH0F2C7Y7', assetType: 'Mobile', brand: 'Apple', model: 'iPhone 14 Pro', notes: '' },
  { serialNumber: 'R3CRC0195VZ', assetType: 'Mobile', brand: 'Samsung', model: 'Galaxy S7', notes: 'SAMSUNG FLIP' },
  { serialNumber: '1', assetType: 'Mobile', brand: 'Nokia', model: 'Lumia 640 XL', notes: '' },
  { serialNumber: 'bytws8qgscbutsde', assetType: 'Mobile', brand: 'Xiaomi', model: 'Redmi 11 Prime 5G', notes: '' },
  { serialNumber: '711KPZK0774597', assetType: 'Mobile', brand: 'Google', model: 'Pixel 2 XL', notes: '' },
  { serialNumber: '57174/X4TK00756', assetType: 'Mobile', brand: 'Xiaomi', model: 'Redmi', notes: '' },
  { serialNumber: 'DNPDT1TN0F0N', assetType: 'Mobile', brand: 'Apple', model: 'iPhone 12', notes: '64GB' },
  { serialNumber: 'G0NXK21KKPFQ', assetType: 'Mobile', brand: 'Apple', model: 'iPhone XS', notes: '' },
  { serialNumber: 'RZ8T31NRJQJ', assetType: 'Mobile', brand: 'Samsung', model: 'Galaxy M12', notes: 'SAMSUNG M12' },
  { serialNumber: 'FK6PKHGQG5QT', assetType: 'Mobile', brand: 'Apple', model: 'iPhone 6 Plus', notes: '' },
  { serialNumber: 'G6TXN4NMKPHC', assetType: 'Mobile', brand: 'Apple', model: 'iPhone XS Max', notes: '' },
  { serialNumber: 'RZCY5240Y9H', assetType: 'Mobile', brand: 'Samsung', model: 'Galaxy M35 5G', notes: '' },
  // NEW MOBILE DEVICES
  { serialNumber: 'RZCX80668XN', assetType: 'Mobile', brand: 'Samsung', model: 'Galaxy M35 5G', notes: 'Samsung Galaxy M35 5G - Model: SM-M356B/DS, IMEI:350967550710178/351942600710170' },
  { serialNumber: '54c6019c', assetType: 'Mobile', brand: 'Xiaomi', model: 'Redmi 13 5G', notes: 'Xiaomi Redmi 13 5G - Model: 2406ERN9CI, IMEI:866487070681863/866487070681871' },
  { serialNumber: 'ZA222V3ZJQ', assetType: 'Mobile', brand: 'Motorola', model: 'Moto G35 5G', notes: 'Motorola Moto G35 5G - Model: XT2433-3, IMEI:350309006819255' },
  { serialNumber: 'RZ8R60D75WM', assetType: 'Mobile', brand: 'Samsung', model: 'Galaxy M32', notes: 'Samsung Galaxy M32' },

  // Monitor (13 total)
  { serialNumber: 'CN01MVD1641803261WJT', assetType: 'Monitor', brand: 'Dell', model: 'Dell S2240L', notes: '' },
  { serialNumber: 'CN01MVD16418041P11VT', assetType: 'Monitor', brand: 'Dell', model: 'Dell S2240L', notes: '' },
  { serialNumber: 'CN0W60D2FCC00873C36IA04', assetType: 'Monitor', brand: 'Dell', model: 'Dell S2240L', notes: '' },
  { serialNumber: 'CN01NVD16418037N1MAT', assetType: 'Monitor', brand: 'Dell', model: 'Dell S2240L', notes: '' },
  { serialNumber: 'CN01MVD16418048T09CT', assetType: 'Monitor', brand: 'Dell', model: 'Dell S2240L', notes: '' },
  { serialNumber: 'CN01MVD16418048TOU8T', assetType: 'Monitor', brand: 'Dell', model: 'Dell S2240L', notes: '' },
  { serialNumber: 'CN01MVD16418047V0DXT', assetType: 'Monitor', brand: 'Dell', model: 'Dell S2240L', notes: '' },
  { serialNumber: 'CN01MVD16418046K0XET', assetType: 'Monitor', brand: 'Dell', model: 'Dell S2240L', notes: '' },
  { serialNumber: 'CN01MVD16418048S1FXT', assetType: 'Monitor', brand: 'Dell', model: 'Dell S2240L', notes: '' },
  { serialNumber: 'CN01MVD16418041D01CT', assetType: 'Monitor', brand: 'Dell', model: 'Dell S2240L', notes: '' },
  { serialNumber: 'CNOW8VY97426126PODJU', assetType: 'Monitor', brand: 'Dell', model: 'Dell S2240L', notes: '' },
  { serialNumber: 'CN0W8VY97426126PODJU', assetType: 'Monitor', brand: 'Dell', model: 'Dell S2240L', notes: '' },
  { serialNumber: 'CN0W8VY97426127209KU', assetType: 'Monitor', brand: 'Dell', model: 'Dell S2240L', notes: '' },

  // Tablet (2 total)
  { serialNumber: 'DMPFFRQGPTRF', assetType: 'Tablet', brand: 'Apple', model: 'iPad', notes: 'iPad' },
  { serialNumber: 'XV9WXHL27P', assetType: 'Tablet', brand: 'Apple', model: 'iPad', notes: 'iPad Pro' },

];

async function seedAssets() {
  console.log('🚀 Starting comprehensive asset seeding...\n');
  
  // Get admin user for audit fields
  const adminUser = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (!adminUser) {
    throw new Error('Admin user not found. Please run the main seed file first.');
  }

  const SYSTEM_USER_ID = adminUser.id;
  console.log(`✅ Using admin user (ID: ${SYSTEM_USER_ID}) for audit fields\n`);

  // List of damaged assets (condition should be DAMAGED)
  const damagedAssets = new Set([
    'FVFVT748J1WL', 'FVHTVNMZJ1WK', 'FVHXGFWQJ1WK', 'FVFX5SVAJ1WK', 'FVFTK4M2H3QD',
    'FVFXQJL2J1WK', 'FVHWLGJFJ1WK', 'C02P33VGG3QH', 'FVHX2B26J1WK', 'FVHX2NYYJ1WK',
    'FVFXP0SHHV27', 'C02T7CDYFVH3', 'C17S900SFVH3', 'FVHW6BN4J1WK', 'C02S5DJ8FVH3',
    'FVHW6BKVJ1WK', 'C02Q4KUCFVH3', 'FVFVT71TJ1WL', 'FVFXJ2T2J1WK', 'FVFV4DPZJ1WK',
    'C17N571MG3QJ', 'C17S907RFVH3', 'C02Q4DEGFVH3', 'C17S907ZFVH3', 'C02L4A12DR53',
    'C17RR7PTFVH3', 'C02NGJNPG3QJ', 'C1MS70AGDTY3', 'C02S5DNLFVH3', 'C02T75DUFVH3',
    'C1MSM2FSDTY3', 'FVFXJUU0J1WK', 'C02PJ2S5FVH5', 'GCCV712ZJ1WK', 'C02Q4KQSFVH3',
    'C02RM1LFFVH3', 'C17PD2HDFVH3', 'C02MK4E6FH00', 'C02S9ZRNFVH3', 'FVFVQ4NRJ1WK',
    'C02FW8HBMD6M', 'FVHX2AXSJ1WK', 'FVFZ5LYTJ1WK', 'C02T4173FVH3', 'FVFXQG06J1WK',
    'C02T2NL2FVH3', 'C02PQXA4FVH3', 'C17N5710G3QJ', 'C02TM0LVFVH3', 'FVHZ1B8TJ1WK',
    'PG013U5C', 'PG012MYU', 'PG011WES'
  ]);

  // Get Electronics category for fallback
  const electronicsCategory = await prisma.assetCategory.findFirst({
    where: { name: 'Electronics' },
  });

  if (!electronicsCategory) {
    throw new Error('Electronics category not found. Please run seed-asset-categories-updated.ts first.');
  }

  const stats = {
    created: 0,
    failed: 0,
    skipped: 0,
    damaged: 0,
    withPurchaseDate: 0,
    withPurchaseCost: 0,
    withBothPurchaseData: 0,
    categories: new Map<string, number>(),
    brands: new Map<string, number>(),
  };

  for (const asset of assetsData) {
    try {
      // First, ensure asset type exists
      let assetType = await prisma.assetType.findFirst({
        where: { name: asset.assetType },
      });

      if (!assetType) {
        // Create generic asset type if doesn't exist
        assetType = await prisma.assetType.create({
          data: {
            name: asset.assetType,
            categoryId: electronicsCategory.id, // Default to Electronics category
            createdBy: SYSTEM_USER_ID,
            updatedBy: SYSTEM_USER_ID,
          },
        });
        console.log(`📦 Created asset type: ${asset.assetType}`);
      }

      // Ensure brand exists
      let brand = await prisma.brand.findFirst({
        where: { name: asset.brand },
      });

      if (!brand) {
        brand = await prisma.brand.create({
          data: {
            name: asset.brand,
            createdBy: SYSTEM_USER_ID,
            updatedBy: SYSTEM_USER_ID,
          },
        });
        console.log(`🏢 Created brand: ${asset.brand}`);
      }

      // Ensure model exists
      let model = await prisma.model.findFirst({
        where: {
          name: asset.model,
          brandId: brand.id,
        },
      });

      if (!model) {
        model = await prisma.model.create({
          data: {
            name: asset.model,
            brandId: brand.id,
            assetTypeId: assetType.id,
            createdBy: SYSTEM_USER_ID,
            updatedBy: SYSTEM_USER_ID,
          },
        });
        console.log(`📱 Created model: ${asset.model}`);
      }

      // Check if asset already exists
      const existingAsset = await prisma.asset.findUnique({
        where: { serialNumber: asset.serialNumber },
      });

      if (existingAsset) {
        console.log(`⚠️  Asset ${asset.serialNumber} already exists, skipping...`);
        stats.skipped++;
        continue;
      }

      // Generate a unique asset ID (4 digits) - get max existing asset ID
      const maxAsset = await prisma.asset.findFirst({
        orderBy: { id: 'desc' },
        select: { assetId: true },
      });
      
      let nextAssetNumber = 1;
      if (maxAsset?.assetId) {
        const match = maxAsset.assetId.match(/AST-(\d+)/);
        if (match) {
          nextAssetNumber = parseInt(match[1]) + 1;
        }
      }
      
      const assetId = `AST-${String(nextAssetNumber).padStart(4, '0')}`;

      // Determine condition based on damaged assets list
      const condition = damagedAssets.has(asset.serialNumber) ? 'DAMAGED' : 'GOOD';

      // Get purchase data from mapping, or use null if not found
      const purchaseData = purchaseDataMapping[asset.serialNumber];
      let purchaseDate: Date | null = null;
      let purchaseCost: number | null = null;

      if (purchaseData) {
        if (purchaseData.purchaseDate) {
          try {
            purchaseDate = new Date(purchaseData.purchaseDate);
          } catch (error) {
            console.warn(`⚠️  Invalid date format for ${asset.serialNumber}: ${purchaseData.purchaseDate}`);
          }
        }
        if (purchaseData.purchaseCost && purchaseData.purchaseCost > 0) {
          purchaseCost = purchaseData.purchaseCost;
        }
      }

      // Create the asset
      await prisma.asset.create({
        data: {
          assetId: assetId,
          serialNumber: asset.serialNumber,
          assetTypeId: assetType.id,
          brandId: brand.id,
          modelId: model.id,
          status: 'AVAILABLE',
          condition: condition,
          notes: asset.notes || null,
          purchaseDate: purchaseDate,
          purchaseCost: purchaseCost,
          createdBy: SYSTEM_USER_ID,
          updatedBy: SYSTEM_USER_ID,
        },
      });

      stats.created++;
      if (condition === 'DAMAGED') {
        stats.damaged++;
      }
      if (purchaseDate) {
        stats.withPurchaseDate++;
      }
      if (purchaseCost) {
        stats.withPurchaseCost++;
      }
      if (purchaseDate && purchaseCost) {
        stats.withBothPurchaseData++;
      }
      stats.categories.set(asset.assetType, (stats.categories.get(asset.assetType) || 0) + 1);
      stats.brands.set(asset.brand, (stats.brands.get(asset.brand) || 0) + 1);

      if (stats.created % 50 === 0) {
        console.log(`✅ Processed ${stats.created} assets...`);
      }
    } catch (error) {
      stats.failed++;
      console.error(`❌ Failed to create asset ${asset.serialNumber}:`, error);
    }
  }

  console.log('\n✨ Asset seeding complete!\n');
  console.log('📊 Final Statistics:');
  console.log(`  Total assets processed: ${assetsData.length}`);
  console.log(`  Successfully created: ${stats.created}`);
  console.log(`  Skipped (already exists): ${stats.skipped}`);
  console.log(`  Assets marked as DAMAGED: ${stats.damaged}`);
  console.log(`  Failed: ${stats.failed}`);
  
  console.log('\n💰 Purchase Data Statistics:');
  console.log(`  Assets with purchase date: ${stats.withPurchaseDate}`);
  console.log(`  Assets with purchase cost: ${stats.withPurchaseCost}`);
  console.log(`  Assets with both date & cost: ${stats.withBothPurchaseData}`);
  console.log(`  Assets with no purchase data: ${stats.created - Math.max(stats.withPurchaseDate, stats.withPurchaseCost)}`);
  
  console.log('\n📦 Assets by Type:');
  Array.from(stats.categories.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
  
  console.log('\n🏢 Assets by Brand:');
  Array.from(stats.brands.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([brand, count]) => {
      console.log(`  ${brand}: ${count}`);
    });
}

// Run the seeding
seedAssets()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

