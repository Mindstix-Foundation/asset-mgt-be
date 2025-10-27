import { PrismaClient, AssetStatus, AssetCondition } from '@prisma/client';

const prisma = new PrismaClient();

function pad(num: number, size: number): string {
  let s = String(num);
  while (s.length < size) s = '0' + s;
  return s;
}

async function seedAssetAssignments() {
  console.log('🌱 Starting asset assignments seed...');

  // Get admin user for audit fields
  const adminUser = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (!adminUser) {
    throw new Error('Admin user not found. Please run the main seed file first.');
  }

  // Mapping of serial numbers to staff IDs based on Sheet1.csv
  const assignments: Array<{ staffId: number; serialNumbers: string[] }> = [
    {
      staffId: 1,
      serialNumbers: ['F5MQWRWF6R', 'FVFF80V7Q05Q', 'PF3Q9PCZ', 'HJFFX3QBJKM9'],
    },
    {
      staffId: 22,
      serialNumbers: [
        'DMPFFRQGPTRF',
        'CN01MVD1641803261WJT',
        'CN01MVD16418041P11VT',
        'BELKIN ROUTER',
        'CN0W60D2FCC00873C36IA04',
        'PNRWQ747X1',
      ],
    },
    {
      staffId: 26,
      serialNumbers: ['C02G1ASMQ6L4', 'CN01NVD16418037N1MAT', 'FVFF9BJ9Q05D'],
    },
    {
      staffId: 33,
      serialNumbers: [
        'C02MK9GWFD56',
        'CN01MVD16418048T09CT',
        'CN01MVD16418048TOU8T',
        'CN01MVD16418047V0DXT',
        'CN01MVD16418046K0XET',
        'CN01MVD16418048S1FXT',
        'C02FF5G9MD6M',
      ],
    },
    {
      staffId: 34,
      serialNumbers: [
        'FK1XG1NSKPHG',
        'C02Q4KVUFVH3',
        'FDJ7GXDWWN',
        '803KPBF1689341',
        'C17V0MQ10G',
        'CN01MVD16418041D01CT',
        'T46W7FV32R',
      ],
    },
    {
      staffId: 38,
      serialNumbers: [
        'CNOW8VY97426126PODJU',
        'CN0W8VY97426126PODJU',
        'HTWWGG9C4Q',
        'FVFG5GXEQ05D',
      ],
    },
    { staffId: 51, serialNumbers: ['G62X90NL71'] },
    {
      staffId: 67,
      serialNumbers: ['FVFJ4TX9Q6L4', 'C07JL0B0DY3G', 'RYW7CTP69Q'],
    },
    { staffId: 71, serialNumbers: ['MN27X43JHQ', 'JR20PWKLGV'] },
    { staffId: 72, serialNumbers: ['C6DMXMGHHD'] },
    { staffId: 89, serialNumbers: ['PF3RKDCS', 'PG013U2J'] },
    { staffId: 115, serialNumbers: ['KW619TR932', 'FVFVV6T6J1WK'] },
    { staffId: 134, serialNumbers: ['FVFFRJXFQ05D', 'FVFFRJT7Q05D'] },
    {
      staffId: 149,
      serialNumbers: ['C02V8DZDHV29', 'FVHXD6J3HV22', 'MP27J2J6'],
    },
    { staffId: 177, serialNumbers: ['C02STDU0GFL'] },
    { staffId: 178, serialNumbers: ['MCXR2YG66T'] },
    { staffId: 182, serialNumbers: ['H9FFXP4DWN'] },
    { staffId: 183, serialNumbers: ['FVFXN1Q4HV27', 'C02JMBPJQ6L4'] },
    {
      staffId: 185,
      serialNumbers: [
        'C02DXD66ML7H',
        'FVFXKB6DHV27',
        '7294P32',
        'FVFXKB6DH27',
      ],
    },
    {
      staffId: 197,
      serialNumbers: [
        'F17W543AJCLY',
        'RZ8T50GA2NE',
        'F17CV4JYN6Y5',
        'e425d35c',
        'F3G9MC2',
        'FVFKC54K1WFV',
      ],
    },
    {
      staffId: 202,
      serialNumbers: ['C02PQQQLFVH5', 'FVFFRJTPQ05D', 'X6DQ4G7V2F'],
    },
    { staffId: 216, serialNumbers: ['RR447QKV3X'] },
    { staffId: 242, serialNumbers: ['QGLQJ41CW0'] },
    { staffId: 254, serialNumbers: ['G0NVQ50VJCLF', 'FVFG19XXQ05D'] },
    {
      staffId: 258,
      serialNumbers: ['FVFFMBEVQ05D', 'PF1PL6XH', 'C02G1UV8Q6L4'],
    },
    { staffId: 260, serialNumbers: ['FVFXDAG2HV27', 'FVHFW1GYQ05D'] },
    { staffId: 283, serialNumbers: ['C02G8M8KQ6L4', 'MP27HQ3H'] },
    { staffId: 311, serialNumbers: ['C02KC2CWQ6L7', 'PF1PL6J4'] },
    { staffId: 315, serialNumbers: ['FVHFW1HFQ05D', 'MP24BQZ7'] },
    { staffId: 328, serialNumbers: ['MHG94T6HPH'] },
    {
      staffId: 331,
      serialNumbers: ['FVFXN1QTHV27', 'FVHXJCF5J1WK', 'R7MFDQVXW3'],
    },
    { staffId: 332, serialNumbers: ['PG015P24'] },
    { staffId: 337, serialNumbers: ['C02G8M3NQ6L4'] },
    { staffId: 338, serialNumbers: ['C02G8M5VQ6L4'] },
    { staffId: 346, serialNumbers: ['MVDWFYVNV9', 'FVFVT74BJ1WL'] },
    { staffId: 349, serialNumbers: ['GTX2P6HDW5'] },
    { staffId: 356, serialNumbers: ['QQDWTV03LV'] },
    { staffId: 357, serialNumbers: ['C02Q4KUDFVH3'] },
    {
      staffId: 359,
      serialNumbers: ['C02L4AHVDR53', 'FVFXJ1AMJ1WK', 'FVFJ6AP81WFV'],
    },
    {
      staffId: 379,
      serialNumbers: ['C02KC2EWQ6L7', 'C02Q4KYRFVH3', 'C5772C93VN'],
    },
    { staffId: 385, serialNumbers: ['FVFFRJZ2Q05D'] },
    {
      staffId: 386,
      serialNumbers: [
        'CN0W8VY97426127209KU',
        'FVFVFGRXJ1WK',
        'FVFKNS3T1WFV',
      ],
    },
    { staffId: 388, serialNumbers: ['FVFKT6PN1WFV'] },
    { staffId: 389, serialNumbers: ['TXQ7W2M26R', 'FVFFRJV7Q05D'] },
    { staffId: 399, serialNumbers: ['C02JM9UFQ6L4'] },
    { staffId: 408, serialNumbers: ['V2TQ0HL49W'] },
    { staffId: 414, serialNumbers: ['C02FFCW5Q6L4', 'MP28J2Z8'] },
    { staffId: 426, serialNumbers: ['LRFV3FT767', 'C02G8W2LQ6L4'] },
    { staffId: 427, serialNumbers: ['HYXQ72MX19', 'FVFF80VFQ05Q'] },
    { staffId: 434, serialNumbers: ['FVFFRJW4Q05D'] },
    {
      staffId: 460,
      serialNumbers: ['RZ8MC0AXM1W', 'DX3H53XRN735', 'FVFF8FE7Q05D'],
    },
    { staffId: 464, serialNumbers: ['FVFJ54JV1WFV', 'C02G8WAHQ6L4'] },
    { staffId: 476, serialNumbers: ['C02G21ETML7H', 'FVFX52BUJ1WK'] },
    { staffId: 482, serialNumbers: ['C02DXD7QML7H'] },
    { staffId: 493, serialNumbers: ['RC2CM94TF3'] },
    { staffId: 506, serialNumbers: ['MP2639XH'] },
    { staffId: 511, serialNumbers: ['C02JJ9JKQ6L4', 'FVFXF6UVHV27'] },
    { staffId: 520, serialNumbers: ['FVFJ6N21WFV', 'LY04WH9JFC'] },
    { staffId: 522, serialNumbers: ['C02G8VX9Q6L4'] },
    {
      staffId: 537,
      serialNumbers: ['FVFVD2ZGJ1WK', 'MP263CF2', 'b168bc8d1222'],
    },
    { staffId: 545, serialNumbers: ['KWPXPP6WPX'] },
    { staffId: 546, serialNumbers: ['MP263A10', 'RYY4DXRD4H'] },
    { staffId: 560, serialNumbers: ['HXVPY74729', 'R62FHPH0JN'] },
    { staffId: 561, serialNumbers: ['C02JJ9EWQ6L4'] },
    { staffId: 563, serialNumbers: ['PG01CH5Q'] },
    { staffId: 569, serialNumbers: ['FVFJ564NQ6L4'] },
    { staffId: 573, serialNumbers: ['M0JMGGJ46R'] },
    { staffId: 576, serialNumbers: ['FVFF9BF4Q05D'] },
    {
      staffId: 577,
      serialNumbers: ['C02JMATAQ6L4', 'PF1PL6HR', 'PG01P2A8'],
    },
    { staffId: 580, serialNumbers: ['RZCX71MB8AH', 'C02JMA0RQ6L4'] },
    {
      staffId: 582,
      serialNumbers: ['XV9WXHL27P', 'RZ8T61DMPCB', 'FVFJQJGN1WFV'],
    },
    {
      staffId: 588,
      serialNumbers: [
        'C02G7BRCML7H',
        'RZ8N7023H0Z',
        '4465AEC8',
        '5LKR99LR0ZNBOZTC',
      ],
    },
    { staffId: 589, serialNumbers: ['F4DWJ7RQ0Q', 'R4KJXD39H3'] },
    { staffId: 590, serialNumbers: ['TDQH62WT07', 'CVH0F2C7Y7'] },
    { staffId: 591, serialNumbers: ['R3CRC0195VZ', 'D9K4R3D2TP'] },
    { staffId: 593, serialNumbers: ['MP27HQ6M'] },
    { staffId: 599, serialNumbers: ['MP262JY2', 'C02JMBPVQ6L4'] },
    { staffId: 601, serialNumbers: ['C02JGR1YQ6L4'] },
    { staffId: 603, serialNumbers: ['C02JMBNKQ6L4'] },
    {
      staffId: 611,
      serialNumbers: ['T9XHJ6VJKH', 'D9DJJYCVWX', 'MP263CAC'],
    },
    { staffId: 613, serialNumbers: ['MP2637MS'] },
    { staffId: 615, serialNumbers: ['PF58K4XS'] },
    { staffId: 620, serialNumbers: ['C02JMBPFQ6L4'] },
    { staffId: 622, serialNumbers: ['MP28J32S'] },
    { staffId: 623, serialNumbers: ['PG02KF95'] },
    { staffId: 626, serialNumbers: ['C02JMBPAQ6L4', 'C02FFCURQ6L4'] },
    { staffId: 629, serialNumbers: ['FVFJ6J511WFV'] },
    { staffId: 632, serialNumbers: ['PF3Q9B36', '1'] },
    { staffId: 635, serialNumbers: ['KJ2096H79W', 'MP2637S2'] },
    { staffId: 644, serialNumbers: ['bytws8qgscbutsde', 'MP28J31Y'] },
    { staffId: 646, serialNumbers: ['LY74GQXWJ1', 'C17FX04BQ6L4'] },
    { staffId: 647, serialNumbers: ['C02G8MA1Q6L4'] },
    { staffId: 649, serialNumbers: ['C02JM9EEQ6L4'] },
    { staffId: 650, serialNumbers: ['C02KC2E9Q6L7'] },
    { staffId: 652, serialNumbers: ['C9TWV1WVYD', 'FVFJ6JFE1WFV'] },
    { staffId: 657, serialNumbers: ['C02KC2EUQ6L7', 'MP263A74'] },
    { staffId: 658, serialNumbers: ['MP2637NP'] },
    { staffId: 661, serialNumbers: ['FVFFLPFBQ05D', 'MP22CSK8'] },
    { staffId: 663, serialNumbers: ['MP263A6K', 'MY9WH1W9K7'] },
    { staffId: 664, serialNumbers: ['FVFFMARYQ05D'] },
    {
      staffId: 665,
      serialNumbers: ['N4W7FNJKW7', 'C02G8W1CQ6L4', '711KPZK0774597'],
    },
    { staffId: 675, serialNumbers: ['C02JMA1DQ6L4', 'C02JMBQWQ6L4'] },
    { staffId: 677, serialNumbers: ['MP25X01S'] },
    { staffId: 678, serialNumbers: ['PG02KF8V'] },
    { staffId: 679, serialNumbers: ['C02G8ME8Q6L4'] },
    { staffId: 682, serialNumbers: ['FVFY84XLHV27'] },
    { staffId: 684, serialNumbers: ['MK2NLXLJ60'] },
    { staffId: 687, serialNumbers: ['HFRJPFP4F9'] },
    { staffId: 689, serialNumbers: ['C02F50TUML7H'] },
    { staffId: 692, serialNumbers: ['C02DVDBPML7H'] },
    { staffId: 693, serialNumbers: ['FVHFW1CUQ05D'] },
    { staffId: 696, serialNumbers: ['FVFFF56JQ05D'] },
    { staffId: 697, serialNumbers: ['FVFX6BM0HV27'] },
    { staffId: 698, serialNumbers: ['C02V2HTHHV27'] },
    { staffId: 699, serialNumbers: ['PF58WMLA'] },
    { staffId: 700, serialNumbers: ['PG02KF8G'] },
    { staffId: 701, serialNumbers: ['X307064YGW'] },
    { staffId: 702, serialNumbers: ['FVFFM0CNQ05D'] },
    { staffId: 703, serialNumbers: ['J930JFJJTC', '57174/X4TK00756'] },
    { staffId: 704, serialNumbers: ['MP2639X9'] },
    { staffId: 707, serialNumbers: ['FVHW69NWJ1WK', 'C02F8DSFQ6L4'] },
    { staffId: 708, serialNumbers: ['C02F8DS4Q6L4'] },
    { staffId: 709, serialNumbers: ['C02FW7QGMD6M'] },
    { staffId: 711, serialNumbers: ['C02JMBQXQ6L4'] },
    { staffId: 712, serialNumbers: ['FVFFRJWFQ05D'] },
    { staffId: 713, serialNumbers: ['FVHFW1M2Q05D', 'PG01FY21'] },
    { staffId: 714, serialNumbers: ['C02JMBS7Q6L4'] },
    { staffId: 715, serialNumbers: ['C02G8M3VQ6L4'] },
    { staffId: 716, serialNumbers: ['C17G59KAQ6L4'] },
    { staffId: 718, serialNumbers: ['C02G8M5MQ6L4'] },
    { staffId: 719, serialNumbers: ['FVFG2FCQQ05D'] },
    { staffId: 721, serialNumbers: ['FVFXDAJQHV27', 'PG02KF4Z'] },
    { staffId: 722, serialNumbers: ['C02G1ALFQ6L4'] },
    { staffId: 105, serialNumbers: ['L43CFL6LR0'] },
    { staffId: 724, serialNumbers: ['MP28PT9Q'] },
    { staffId: 725, serialNumbers: ['TFXWR630H4'] },
    { staffId: 728, serialNumbers: ['XJ0K62H6GF'] },
    { staffId: 730, serialNumbers: ['C02G8M27Q6L4'] },
    { staffId: 731, serialNumbers: ['KW7HQVX5M7', 'DNPDT1TN0F0N'] },
    {
      staffId: 732,
      serialNumbers: [
        'MP263CG4',
        'G0NXK21KKPFQ',
        'FVHXG6ESHV29',
        'C02JJ9K5Q6L4',
      ],
    },
    { staffId: 733, serialNumbers: ['MP263FGV', 'MP24BPDC'] },
    { staffId: 734, serialNumbers: ['MP263A16', 'C02G8AQ6ML7H'] },
    { staffId: 736, serialNumbers: ['FVFFMBBZQ05D'] },
    { staffId: 737, serialNumbers: ['C02KCDVHQ6L4'] },
    { staffId: 738, serialNumbers: ['PF3W96XX'] },
    { staffId: 739, serialNumbers: ['PG02KESE', 'R9ZY30G0X2T'] },
    { staffId: 741, serialNumbers: ['Q2YF2R6W2M'] },
    { staffId: 742, serialNumbers: ['PF1ES933'] },
    { staffId: 743, serialNumbers: ['C02JMA1YQ6L4'] },
    { staffId: 744, serialNumbers: ['PG01GMWA'] },
    { staffId: 745, serialNumbers: ['C02MDFSVFH00', 'PG02KF7E'] },
    { staffId: 746, serialNumbers: ['MP263CFL', 'MP263AOP'] },
    { staffId: 748, serialNumbers: ['C02D97TDML7L', 'C02JMBPZQ6L4'] },
    { staffId: 749, serialNumbers: ['RZ8T31NRJQJ', 'FVFJ6GN21WFV'] },
    { staffId: 750, serialNumbers: ['MP24BV67'] },
    { staffId: 751, serialNumbers: ['KNA02QIG'] },
    { staffId: 752, serialNumbers: ['FVFF9BXPQ05D'] },
    {
      staffId: 754,
      serialNumbers: ['10R09704', 'PF0X2TAH', 'FVFXP23UJK78'],
    },
    { staffId: 757, serialNumbers: ['C02DM29CML7H'] },
    { staffId: 758, serialNumbers: ['PG01P77B', 'MP24BQ27'] },
    {
      staffId: 759,
      serialNumbers: ['MP27HVQ9', 'RZ8T61E8H2X', 'C02JM9CSQ6L4'],
    },
    {
      staffId: 760,
      serialNumbers: ['MP27JBK5', 'HKGH2WG147', 'FK6PKHGQG5QT'],
    },
    { staffId: 761, serialNumbers: ['PG01FY2G'] },
    { staffId: 763, serialNumbers: ['PF58YTLG'] },
    { staffId: 765, serialNumbers: ['C02T7D9JGVC1', 'PG01GMUJ'] },
    { staffId: 767, serialNumbers: ['FVFXP0S7HV27'] },
    { staffId: 768, serialNumbers: ['L7G91377N2'] },
    {
      staffId: 770,
      serialNumbers: ['PG01DZDP', 'MP27HSEP', 'MP263A1J'],
    },
    { staffId: 771, serialNumbers: ['MMQ4JJJ4D6'] },
    { staffId: 772, serialNumbers: ['C5YY2JQ4TF'] },
    { staffId: 773, serialNumbers: ['FVFZ87CGJ1WK'] },
    { staffId: 774, serialNumbers: ['FVFXN1PEHV27'] },
    { staffId: 777, serialNumbers: ['LV4P56XRY0'] },
    {
      staffId: 778,
      serialNumbers: ['MP263CCV', 'G6TXN4NMKPHC', 'RZ8T61E82BJ'],
    },
    { staffId: 779, serialNumbers: ['C02T7C4YFVH3'] },
    { staffId: 780, serialNumbers: ['MP26A47W'] },
    { staffId: 781, serialNumbers: ['FVFXN3EVHV27'] },
    { staffId: 782, serialNumbers: ['C02Q4L1JFVH3', 'MP28PT90'] },
    { staffId: 783, serialNumbers: ['NCQ0HJ75LQ'] },
    { staffId: 784, serialNumbers: ['C02T88JSFVH3'] },
    { staffId: 785, serialNumbers: ['C02T3KLVFVH3'] },
    { staffId: 786, serialNumbers: ['FVFXP0TGHV27'] },
    { staffId: 787, serialNumbers: ['C02DCPTBML7H'] },
    { staffId: 788, serialNumbers: ['C02JH7TYQ6L4'] },
    { staffId: 789, serialNumbers: ['FVFXN1RHHV27'] },
    { staffId: 790, serialNumbers: ['FVFKT6HT1WFV'] },
    { staffId: 791, serialNumbers: ['PF1Q48D4'] },
    { staffId: 792, serialNumbers: ['C02FD237ML7H'] },
    { staffId: 793, serialNumbers: ['FVFZ3FGML40Y', 'NH4H5KX9LM'] },
    { staffId: 794, serialNumbers: ['RZCY5240Y9H', 'C02HK45QJR9V'] },
    { staffId: 796, serialNumbers: ['PF1M6BT7'] },
    { staffId: 797, serialNumbers: ['C02JJ9K3Q6L4', 'MJ0FPFXE'] },
    { staffId: 799, serialNumbers: ['C02JMBPLQ6L4'] },
    { staffId: 8001, serialNumbers: ['MP263A0H'] },
  ];

  let successCount = 0;
  let errorCount = 0;

  console.log(`📝 Processing ${assignments.length} employee assignments...`);

  for (const assignment of assignments) {
    const employeeId = pad(assignment.staffId, 4);

    // Get employee
    const employee = await prisma.employee.findUnique({
      where: { employeeId },
    });

    if (!employee) {
      console.warn(`⚠️  Employee not found: ${employeeId}`);
      errorCount += assignment.serialNumbers.length;
      continue;
    }

    for (const serialNumber of assignment.serialNumbers) {
      try {
        // Get asset by serial number
        const asset = await prisma.asset.findUnique({
          where: { serialNumber },
        });

        if (!asset) {
          console.warn(
            `⚠️  Asset not found for serial number: ${serialNumber}`,
          );
          errorCount++;
          continue;
        }

        // Check if asset is already assigned
        const existingIssue = await prisma.assetIssue.findFirst({
          where: {
            assetId: asset.id,
            returnDate: null, // Not yet returned
          },
        });

        if (existingIssue) {
          console.log(
            `⚠️  Asset ${serialNumber} is already assigned, skipping...`,
          );
          errorCount++;
          continue;
        }

        // Create asset issue (assignment)
        await prisma.assetIssue.create({
          data: {
            assetId: asset.id,
            employeeId: employee.id,
            issuedBy: adminUser.id,
            issueDate: new Date(),
            issueCondition: AssetCondition.NEW,
            createdBy: adminUser.id,
            updatedBy: adminUser.id,
          },
        });

        // Update asset status to ASSIGNED
        await prisma.asset.update({
          where: { id: asset.id },
          data: {
            status: AssetStatus.ASSIGNED,
            updatedBy: adminUser.id,
          },
        });

        successCount++;
      } catch (error: any) {
        console.error(
          `❌ Error assigning asset ${serialNumber} to employee ${employeeId}:`,
          error.message,
        );
        errorCount++;
      }
    }
  }

  console.log(`✅ Successfully assigned ${successCount} assets to employees`);
  console.log(`⚠️  Skipped/Failed: ${errorCount} assignments`);
}

async function main() {
  try {
    await seedAssetAssignments();
    console.log('🎉 Asset assignments seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error in main:', e);
    await prisma.$disconnect();
    process.exit(1);
  });

