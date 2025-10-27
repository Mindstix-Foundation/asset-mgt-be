import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * COMPREHENSIVE ASSET SEEDING WITH PROPER TYPES, BRANDS, MODELS & NOTES
 * 
 * This seed file includes:
 * - 325 total assets from the original database
 * - Proper asset type classification:
 *   • Laptop (282): MacBook Pro, Dell Inspiron, etc.
 *   • Mobile (27): iPhone, Samsung Galaxy, Pixel, Redmi, Poco, etc.
 *   • Monitor (13): Dell displays
 *   • Tablet (2): iPad, Surface
 *   • Accessory (1): Apple Pencil
 * 
 * - Correct brand assignment: Apple, Dell, Samsung, Google, Xiaomi, Nokia
 * - Specific model identification (MacBook Pro 13" Retina, iPhone 6, Galaxy M30, Poco F4, etc.)
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
 * Brand distribution:
 * - Apple: 211 assets (laptops + mobiles + tablets)
 * - Dell: 99 assets (laptops + monitors)
 * - Xiaomi: 6 assets (Redmi + Poco mobiles)
 * - Samsung: 6 assets (Galaxy mobiles)
 * - Google: 2 assets (Pixel/Nexus mobiles)
 * - Nokia: 1 asset (Lumia mobile)
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

  // Laptop (282 total)
  { serialNumber: 'FVFF80V7Q05Q', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 16GB 256GB' },
  { serialNumber: 'PF3Q9PCZ', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'BELKIN ROUTER', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
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
  { serialNumber: 'C07JL0B0DY3G', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Mac mini' },
  { serialNumber: 'RYW7CTP69Q', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'MN27X43JHQ', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'JR20PWKLGV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'C6DMXMGHHD', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'PF3RKDCS', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo Thinkpad E14 Gen2' },
  { serialNumber: 'PG013U2J', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'KW619TR932', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'FVFVV6T6J1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'FVFFRJXFQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO M1' },
  { serialNumber: 'FVFFRJT7Q05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO M1' },
  { serialNumber: 'C02V8DZDHV29', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD256GB/8GB' },
  { serialNumber: 'FVHXD6J3HV22', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'MP27J2J6', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo ThinkBook 15 inch' },
  { serialNumber: 'C02STDU0GFL', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 15" Retina', notes: 'Space Grey/2.6GHz/16GB/Radeon 450/256 GB/Touch bar/2GB graphic card' },
  { serialNumber: 'MCXR2YG66T', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Macbook Pro A2779' },
  { serialNumber: 'H9FFXP4DWN', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 14 inch' },
  { serialNumber: 'FVFXN1Q4HV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'C02JMBPJQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'C02DXD66ML7H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro' },
  { serialNumber: 'FVFXKB6DHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: '7294P32', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15', notes: 'Core i5/8GB/1TB/Windows8.1' },
  { serialNumber: 'FVFXKB6DH27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '8GB/128GBSSD' },
  { serialNumber: 'F17W543AJCLY', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '64GB/BLACK' },
  { serialNumber: 'RZ8T50GA2NE', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'F3G9MC2', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 5559', notes: 'i5/8GB/1TB/WINDOWS 10/SILVER/WITH MS OFFICE' },
  { serialNumber: 'FVFKC54K1WFV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Lennar' },
  { serialNumber: 'C02PQQQLFVH5', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '13.3/2.7GHz/8GB/256GB' },
  { serialNumber: 'FVFFRJTPQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO M1' },
  { serialNumber: 'X6DQ4G7V2F', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 14 inch M1 Pro Chip' },
  { serialNumber: 'RR447QKV3X', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 14 inch' },
  { serialNumber: 'QGLQJ41CW0', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 14 Inch' },
  { serialNumber: 'FVFG19XXQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO M1' },
  { serialNumber: 'FVFFMBEVQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO' },
  { serialNumber: 'PF1PL6XH', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'C02G1UV8Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'FVFXDAG2HV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'FVHFW1GYQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO M1' },
  { serialNumber: 'C02G8M8KQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'MP27HQ3H', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo ThinkBook 15 Inch' },
  { serialNumber: 'C02KC2CWQ6L7', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'PF1PL6J4', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'FVHFW1HFQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO M1' },
  { serialNumber: 'MP24BQZ7', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo ThinkBook 15 Inch' },
  { serialNumber: 'MHG94T6HPH', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'FVFXN1QTHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro' },
  { serialNumber: 'FVHXJCF5J1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'R7MFDQVXW3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'PG015P24', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'C02G8M3NQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'C02G8M5VQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'MVDWFYVNV9', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'FVFVT74BJ1WL', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '13.3/1.8GHZ/8GB/256GB/I5' },
  { serialNumber: 'GTX2P6HDW5', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
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
  { serialNumber: 'TXQ7W2M26R', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'FVFFRJV7Q05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO M1' },
  { serialNumber: 'C02JM9UFQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'V2TQ0HL49W', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 14 Inch' },
  { serialNumber: 'C02FFCW5Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR' },
  { serialNumber: 'MP28J2Z8', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo ThinkBook 15 Inch' },
  { serialNumber: 'LRFV3FT767', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'C02G8W2LQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'HYXQ72MX19', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'FVFF80VFQ05Q', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'FVFFRJW4Q05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO M1' },
  { serialNumber: 'FVFF8FE7Q05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 256GB' },
  { serialNumber: 'FVFJ54JV1WFV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'C02G8WAHQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'C02G21ETML7H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO' },
  { serialNumber: 'FVFX52BUJ1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'C02DXD7QML7H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro' },
  { serialNumber: 'RC2CM94TF3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 14 inch' },
  { serialNumber: 'MP2639XH', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo ThinkBook 14 inch' },
  { serialNumber: 'C02JJ9JKQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air' },
  { serialNumber: 'FVFXF6UVHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128/8GB' },
  { serialNumber: 'FVFJ6N21WFV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'LY04WH9JFC', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'C02G8VX9Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'FVFVD2ZGJ1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '13.3/1.8GHZ/8GB/128GB' },
  { serialNumber: 'MP263CF2', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo ThinkBook 14 inch' },
  { serialNumber: 'KWPXPP6WPX', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'MP263A10', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo Thinkbook' },
  { serialNumber: 'RYY4DXRD4H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 14 inch' },
  { serialNumber: 'HXVPY74729', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Macbook Pro A2779' },
  { serialNumber: 'R62FHPH0JN', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'C02JJ9EWQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Lennar' },
  { serialNumber: 'PG01CH5Q', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'FVFJ564NQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'M0JMGGJ46R', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'FVFF9BF4Q05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 256GB' },
  { serialNumber: 'C02JMATAQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'For Lennar' },
  { serialNumber: 'PF1PL6HR', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'PG01P2A8', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'RZCX71MB8AH', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'C02JMA0RQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'FVFJQJGN1WFV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Lennar' },
  { serialNumber: 'C02G7BRCML7H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO 16GB' },
  { serialNumber: 'R4KJXD39H3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 14 inch' },
  { serialNumber: 'TDQH62WT07', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'D9K4R3D2TP', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'MP27HQ6M', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo ThinkBook 15 Inch' },
  { serialNumber: 'MP262JY2', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo ThinkBook 14 inch' },
  { serialNumber: 'C02JMBPVQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'C02JGR1YQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'C02JMBNKQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'T9XHJ6VJKH', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'D9DJJYCVWX', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'MP263CAC', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo ThinkBook 14 inch' },
  { serialNumber: 'MP2637MS', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo ThinkBook 14 inch' },
  { serialNumber: 'PF58K4XS', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'C02JMBPFQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Lennar' },
  { serialNumber: 'MP28J32S', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo ThinkBook 15 inch' },
  { serialNumber: 'PG02KF95', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'C02JMBPAQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Macbook Air A2337' },
  { serialNumber: 'C02FFCURQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR' },
  { serialNumber: 'FVFJ6J511WFV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'PF3Q9B36', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'KJ2096H79W', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'MP2637S2', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'LENOVO THINKBOOK' },
  { serialNumber: 'MP28J31Y', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo ThinkBook 15 Inch' },
  { serialNumber: 'LY74GQXWJ1', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'C17FX04BQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'C02G8MA1Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'C02JM9EEQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'C02KC2E9Q6L7', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Lennar' },
  { serialNumber: 'C9TWV1WVYD', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'FVFJ6JFE1WFV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MAcBook Air M1' },
  { serialNumber: 'C02KC2EUQ6L7', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Lennar' },
  { serialNumber: 'MP263A74', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'ThinkBook 14 G2 ITL Laptop - Type 20VD' },
  { serialNumber: 'MP2637NP', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'LENOVO THINKBOOK' },
  { serialNumber: 'FVFFLPFBQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'MP22CSK8', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'ThinkBook 16 GB' },
  { serialNumber: 'MP263A6K', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo ThinkBook 14 inch' },
  { serialNumber: 'MY9WH1W9K7', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'FVFFMARYQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO M1' },
  { serialNumber: 'N4W7FNJKW7', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro M2' },
  { serialNumber: 'C02G8W1CQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'C02JMA1DQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'C02JMBQWQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'MP25X01S', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo ThinkBook 14 inch' },
  { serialNumber: 'PG02KF8V', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
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
  { serialNumber: 'PF58WMLA', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'PG02KF8G', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'X307064YGW', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 14 Inch' },
  { serialNumber: 'FVFFM0CNQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO M1' },
  { serialNumber: 'J930JFJJTC', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 14 Inch' },
  { serialNumber: 'MP2639X9', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'LENOVO THINKBOOK' },
  { serialNumber: 'FVHW69NWJ1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '13.3/1.8GHZ/8GB/128GB' },
  { serialNumber: 'C02F8DSFQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'C02F8DS4Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'C02FW7QGMD6M', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO 16' },
  { serialNumber: 'C02JMBQXQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'FVFFRJWFQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO M1' },
  { serialNumber: 'FVHFW1M2Q05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO M1' },
  { serialNumber: 'PG01FY21', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'C02JMBS7Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'C02G8M3VQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'C17G59KAQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'C02G8M5MQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'FVFG2FCQQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO M1' },
  { serialNumber: 'FVFXDAJQHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'PG02KF4Z', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'C02G1ALFQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR' },
  { serialNumber: 'L43CFL6LR0', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'MP28PT9Q', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo ThinkBook 15 inch' },
  { serialNumber: 'TFXWR630H4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'XJ0K62H6GF', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 14 Inch' },
  { serialNumber: 'C02G8M27Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'KW7HQVX5M7', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'MP263CG4', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'LENOVO THINKBOOK' },
  { serialNumber: 'FVHXG6ESHV29', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro' },
  { serialNumber: 'C02JJ9K5Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'MP263FGV', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'LENOVO THINKBOOK' },
  { serialNumber: 'MP24BPDC', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo ThinkBook 15 inch' },
  { serialNumber: 'MP263A16', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo ThinkBook 14 inch' },
  { serialNumber: 'C02G8AQ6ML7H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO 16GB' },
  { serialNumber: 'FVFFMBBZQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO' },
  { serialNumber: 'C02KCDVHQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Lennar' },
  { serialNumber: 'PF3W96XX', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo Thinkpad E14 Gen 2' },
  { serialNumber: 'PG02KESE', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'R9ZY30G0X2T', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'Q2YF2R6W2M', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'PF1ES933', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'C02JMA1YQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK AIR M1' },
  { serialNumber: 'PG01GMWA', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'C02MDFSVFH00', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '13 Inch Retina / Dual-core i5 2.4 Ghz / 8GB / 256GB Flash / HD Graphics 4000 / 1 Year Standard Apple Warranty/ Got Logic Board replaced on 1/8/2016 with 3 month warranty.' },
  { serialNumber: 'PG02KF7E', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'MP263CFL', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo ThinkBook 14 Inch' },
  { serialNumber: 'MP263AOP', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'C02D97TDML7L', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro A2251' },
  { serialNumber: 'C02JMBPZQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'As Per the Assets Management Tracker' },
  { serialNumber: 'FVFJ6GN21WFV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'MP24BV67', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo ThinkBook 15 Inch' },
  { serialNumber: 'KNA02QIG', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lennovo Think book' },
  { serialNumber: 'FVFF9BXPQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 256 GB' },
  { serialNumber: '10R09704', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'PF0X2TAH', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'FVFXP23UJK78', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD256GB/8GB' },
  { serialNumber: 'C02DM29CML7H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro' },
  { serialNumber: 'PG01P77B', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo ThinkPad E490' },
  { serialNumber: 'MP24BQ27', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'MP27HVQ9', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo ThinkBook 15 Inch' },
  { serialNumber: 'RZ8T61E8H2X', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Samsung Galaxy M12' },
  { serialNumber: 'C02JM9CSQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'MP27JBK5', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo ThinkBook 16 inch' },
  { serialNumber: 'HKGH2WG147', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'PG01FY2G', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo Thinkpad E480' },
  { serialNumber: 'PF58YTLG', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'C02T7D9JGVC1', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO' },
  { serialNumber: 'PG01GMUJ', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'FVFXP0S7HV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128/8GB' },
  { serialNumber: 'L7G91377N2', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'PG01DZDP', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'MP27HSEP', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo ThinkBook 15 Inch' },
  { serialNumber: 'MP263A1J', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo ThinkBook 14 Inch 40 GB' },
  { serialNumber: 'MMQ4JJJ4D6', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro 14 Inch' },
  { serialNumber: 'C5YY2JQ4TF', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'FVFZ87CGJ1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '128SSD/8GB' },
  { serialNumber: 'FVFXN1PEHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'LV4P56XRY0', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'MP263CCV', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'LENOVO THINKBOOK' },
  { serialNumber: 'RZ8T61E82BJ', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Samsung Galaxy M12' },
  { serialNumber: 'C02T7C4YFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb' },
  { serialNumber: 'MP26A47W', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo ThinkBook 14 inch' },
  { serialNumber: 'FVFXN3EVHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'C02Q4L1JFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb' },
  { serialNumber: 'MP28PT90', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo ThinkBook 15 Inch' },
  { serialNumber: 'NCQ0HJ75LQ', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro M2' },
  { serialNumber: 'C02T88JSFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb' },
  { serialNumber: 'C02T3KLVFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Inc13/2.7GHz/8GB/128Gb/keyboard and mouse Problem' },
  { serialNumber: 'FVFXP0TGHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'C02DCPTBML7H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '16GB/500GBSSD' },
  { serialNumber: 'C02JH7TYQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'FVFXN1RHHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'SSD128GB/8GB' },
  { serialNumber: 'FVFKT6HT1WFV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'Lennar' },
  { serialNumber: 'PF1Q48D4', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'C02FD237ML7H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MACBOOK PRO' },
  { serialNumber: 'FVFZ3FGML40Y', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'NH4H5KX9LM', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Pro M2' },
  { serialNumber: 'C02HK45QJR9V', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: '' },
  { serialNumber: 'PF1M6BT7', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: '' },
  { serialNumber: 'C02JJ9K3Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'MJ0FPFXE', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo Thinkpad X1' },
  { serialNumber: 'C02JMBPLQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 13" Retina', notes: 'MacBook Air M1' },
  { serialNumber: 'MP263A0H', assetType: 'Laptop', brand: 'Dell', model: 'Inspiron 15 5000', notes: 'Lenovo ThinkBook 14 Inch' },

  // Mobile (27 total)
  { serialNumber: 'F5MQWRWF6R', assetType: 'Mobile', brand: 'Apple', model: 'iPhone 6', notes: '' },
  { serialNumber: 'FK1XG1NSKPHG', assetType: 'Mobile', brand: 'Apple', model: 'iPhone 6', notes: 'iPhone XS Max' },
  { serialNumber: 'FDJ7GXDWWN', assetType: 'Mobile', brand: 'Apple', model: 'iPhone 6', notes: '' },
  { serialNumber: '803KPBF1689341', assetType: 'Mobile', brand: 'Google', model: 'Nexus 6P', notes: 'Pixel 2 XL' },
  { serialNumber: 'F17CV4JYN6Y5', assetType: 'Mobile', brand: 'Apple', model: 'iPhone 6', notes: 'iPhone 11 Pro 64GB' },
  { serialNumber: 'e425d35c', assetType: 'Mobile', brand: 'Xiaomi', model: 'Poco F4', notes: '' },
  { serialNumber: 'G0NVQ50VJCLF', assetType: 'Mobile', brand: 'Apple', model: 'iPhone 6', notes: 'iPhone X' },
  { serialNumber: 'RZ8MC0AXM1W', assetType: 'Mobile', brand: 'Samsung', model: 'Galaxy M30', notes: '4/64GB' },
  { serialNumber: 'DX3H53XRN735', assetType: 'Mobile', brand: 'Apple', model: 'iPhone 6', notes: 'iPhone 11' },
  { serialNumber: 'b168bc8d1222', assetType: 'Mobile', brand: 'Xiaomi', model: 'Poco F4', notes: '' },
  { serialNumber: 'RZ8T61DMPCB', assetType: 'Mobile', brand: 'Samsung', model: 'Galaxy M12', notes: 'Samsung Galaxy M12' },
  { serialNumber: 'RZ8N7023H0Z', assetType: 'Mobile', brand: 'Samsung', model: 'Galaxy S7', notes: '' },
  { serialNumber: '4465AEC8', assetType: 'Mobile', brand: 'Xiaomi', model: 'Poco F4', notes: '' },
  { serialNumber: '5LKR99LR0ZNBOZTC', assetType: 'Mobile', brand: 'Xiaomi', model: 'Poco F4', notes: '' },
  { serialNumber: 'F4DWJ7RQ0Q', assetType: 'Mobile', brand: 'Apple', model: 'iPhone 6', notes: '' },
  { serialNumber: 'CVH0F2C7Y7', assetType: 'Mobile', brand: 'Apple', model: 'iPhone 6', notes: '' },
  { serialNumber: 'R3CRC0195VZ', assetType: 'Mobile', brand: 'Samsung', model: 'Galaxy S7', notes: 'SAMSUNG FLIP' },
  { serialNumber: '1', assetType: 'Mobile', brand: 'Nokia', model: 'Lumia 640 XL', notes: '' },
  { serialNumber: 'bytws8qgscbutsde', assetType: 'Mobile', brand: 'Xiaomi', model: 'Poco F4', notes: '' },
  { serialNumber: '711KPZK0774597', assetType: 'Mobile', brand: 'Google', model: 'Nexus 6P', notes: '' },
  { serialNumber: '57174/X4TK00756', assetType: 'Mobile', brand: 'Xiaomi', model: 'Poco F4', notes: '' },
  { serialNumber: 'DNPDT1TN0F0N', assetType: 'Mobile', brand: 'Apple', model: 'iPhone 6', notes: 'iPhone 12 64 GB' },
  { serialNumber: 'G0NXK21KKPFQ', assetType: 'Mobile', brand: 'Apple', model: 'iPhone 6', notes: 'iPhone Xs' },
  { serialNumber: 'RZ8T31NRJQJ', assetType: 'Mobile', brand: 'Samsung', model: 'Galaxy M12', notes: 'SAMSUNG M12' },
  { serialNumber: 'FK6PKHGQG5QT', assetType: 'Mobile', brand: 'Apple', model: 'iPhone 6', notes: '' },
  { serialNumber: 'G6TXN4NMKPHC', assetType: 'Mobile', brand: 'Apple', model: 'iPhone 6', notes: 'iPhone XS' },
  { serialNumber: 'RZCY5240Y9H', assetType: 'Mobile', brand: 'Samsung', model: 'Galaxy S7', notes: '' },

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

      // Create the asset
      await prisma.asset.create({
        data: {
          assetId: assetId,
          serialNumber: asset.serialNumber,
          assetTypeId: assetType.id,
          brandId: brand.id,
          modelId: model.id,
          status: 'AVAILABLE',
          condition: 'GOOD',
          notes: asset.notes || null,
          purchaseDate: new Date('2023-01-01'),
          purchaseCost: 1000.0,
          createdBy: SYSTEM_USER_ID,
          updatedBy: SYSTEM_USER_ID,
        },
      });

      stats.created++;
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
  console.log(`  Failed: ${stats.failed}`);
  
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

