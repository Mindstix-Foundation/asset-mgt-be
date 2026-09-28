import { PrismaClient, EmployeeStatus } from '@prisma/client';

const prisma = new PrismaClient();

function pad(num: number, size: number): string {
  let s = String(num);
  while (s.length < size) s = '0' + s;
  return s;
}

async function seedEmployeesFromCSV() {
  console.log('🌱 Starting employee seed from CSV...');

  // Get admin user for audit fields
  const adminUser = await prisma.user.findFirst({
    where: { employee: { employeeId: '9999' } },
  });

  if (!adminUser) {
    throw new Error('Admin user not found. Please run the main seed file first.');
  }

  const employees = [
    { staffId: 1, name: 'Roshan Kulkarni' },
    { staffId: 22, name: 'Hardik Patel' },
    { staffId: 26, name: 'Ashish Bhargava' },
    { staffId: 33, name: 'Yagnesh Chawda' },
    { staffId: 34, name: 'Ankur Mehta' },
    { staffId: 38, name: 'Ambikeshwar Singh' },
    { staffId: 51, name: 'Srinivas Reddy' },
    { staffId: 67, name: 'Akash Salunkhe' },
    { staffId: 71, name: 'Pranita Kotkar' },
    { staffId: 72, name: 'Varsha Mane' },
    { staffId: 89, name: 'Urmi Chawda' },
    { staffId: 115, name: 'Ishani Thaker' },
    { staffId: 134, name: 'Yashvant Revandkar' },
    { staffId: 149, name: 'Ajit Kulkarni' },
    { staffId: 177, name: 'Hitesh Wagh' },
    { staffId: 178, name: 'Asim Shah' },
    { staffId: 182, name: 'Ranjan Verma' },
    { staffId: 183, name: 'Sangram Jagtap' },
    { staffId: 185, name: 'Sherin Varghese' },
    { staffId: 197, name: 'Niharika Katare' },
    { staffId: 202, name: 'Saisanthosh Dasari' },
    { staffId: 216, name: 'Rahul Thakor' },
    { staffId: 242, name: 'Pranay Raut' },
    { staffId: 254, name: 'Deepika Vinchurkar' },
    { staffId: 258, name: 'Govind Sharma' },
    { staffId: 260, name: 'Abhishek Kumar Rohan' },
    { staffId: 283, name: 'Suruchi Garg' },
    { staffId: 311, name: 'Shubham Marulkar' },
    { staffId: 315, name: 'Prajyot Kondekar' },
    { staffId: 328, name: 'Pramod Konda' },
    { staffId: 331, name: 'Devang Sharma' },
    { staffId: 332, name: 'Suraj Yadav' },
    { staffId: 337, name: 'Kaivalya Bhale' },
    { staffId: 338, name: 'Himanshu Advani' },
    { staffId: 346, name: 'Abhishek Khutwad' },
    { staffId: 349, name: 'Pratiksha Wagh' },
    { staffId: 356, name: 'Abhijeet Kokane' },
    { staffId: 357, name: 'Aditya Potdar' },
    { staffId: 359, name: 'Mohit Chunawala' },
    { staffId: 379, name: 'Jay Gandhi' },
    { staffId: 385, name: 'Vaibhav Mahajan' },
    { staffId: 386, name: 'Shubham Hadake' },
    { staffId: 388, name: 'Ashwini Shinde' },
    { staffId: 389, name: 'Prathamesh Nagargoje' },
    { staffId: 399, name: 'Saima Ansari' },
    { staffId: 408, name: 'Tanuj Abraham' },
    { staffId: 414, name: 'Arushi Kothari' },
    { staffId: 426, name: 'Akanksha Dhumal' },
    { staffId: 427, name: 'Mohan Mohadikar' },
    { staffId: 434, name: 'Rohit Chauhan' },
    { staffId: 460, name: 'Pradip Phadatare' },
    { staffId: 464, name: 'Amruta Kulkarni' },
    { staffId: 476, name: 'Vishal Pawar' },
    { staffId: 482, name: 'Ayush Bahuguna' },
    { staffId: 493, name: 'Aamod Kale' },
    { staffId: 506, name: 'Aditi Goyal' },
    { staffId: 511, name: 'Panini Prabhukhanolkar' },
    { staffId: 520, name: 'Kevin Emmatty' },
    { staffId: 522, name: 'Rahul Jadav' },
    { staffId: 537, name: 'Anitha Bapna' },
    { staffId: 545, name: 'Apoorv Gupta' },
    { staffId: 546, name: 'Anshul Amol Rokde' },
    { staffId: 560, name: 'Pranav Hadawale' },
    { staffId: 563, name: 'Chirag Shah' },
    { staffId: 569, name: 'Aditi Acharya' },
    { staffId: 573, name: 'Aditya Choudhari' },
    { staffId: 576, name: 'Abhijeet Rahul Dhawale' },
    { staffId: 577, name: 'Amogasiddha Vitthal Chougule' },
    { staffId: 580, name: 'Swati Rayatuwar' },
    { staffId: 582, name: 'Pranjalee Gadle' },
    { staffId: 588, name: 'Rutuja Vijay Sable' },
    { staffId: 589, name: 'Abdul Khan' },
    { staffId: 590, name: 'Abbas Dahodwala' },
    { staffId: 591, name: 'Vidurraje Deshmukh' },
    { staffId: 593, name: 'Anshu Tiwari' },
    { staffId: 599, name: 'Jayesh Dhanraj Jadhav' },
    { staffId: 601, name: 'Vivek Sarjal' },
    { staffId: 603, name: 'Jitesh Chandrakant Dhumal' },
    { staffId: 611, name: 'Neeraj Mahapatra' },
    { staffId: 613, name: 'L R T J NAIDU' },
    { staffId: 615, name: 'Anirudha Kishor Welukar' },
    { staffId: 620, name: 'Amruta Joshi' },
    { staffId: 622, name: 'Shrihari Sunil Eknathe' },
    { staffId: 623, name: 'Atharva Joshi' },
    { staffId: 626, name: 'Hitanshu Ramesh Machhi' },
    { staffId: 629, name: 'Rahul Madan' },
    { staffId: 632, name: 'Shubham Khetre' },
    { staffId: 635, name: 'Raj Pratap Singh' },
    { staffId: 644, name: 'Bhavana Mishra' },
    { staffId: 646, name: 'Abhaya Shahare' },
    { staffId: 647, name: 'Rahul Palande' },
    { staffId: 649, name: 'Kartik Mohan Dabre' },
    { staffId: 650, name: 'Akshay Durgade' },
    { staffId: 652, name: 'Pranav Kulkarni' },
    { staffId: 657, name: 'Pankaj Bhausaheb Sangle' },
    { staffId: 658, name: 'Vivek Dinesh Patel' },
    { staffId: 661, name: 'Abhishek Pradeep More' },
    { staffId: 663, name: 'Sameer Abhay Pardeshi' },
    { staffId: 664, name: 'Badal Chaganlal Oza' },
    { staffId: 665, name: 'Komal Jibhau Shewale' },
    { staffId: 675, name: 'Parth Kapadia' },
    { staffId: 677, name: 'Siddhant Raut' },
    { staffId: 678, name: 'Deeplaxmi Patil' },
    { staffId: 679, name: 'Suraj Moon' },
    { staffId: 682, name: 'Kanika Rawal' },
    { staffId: 684, name: 'Alhaj Siddiqui' },
    { staffId: 687, name: 'Pranit Shirsath' },
    { staffId: 689, name: 'Anuja Deshpande' },
    { staffId: 692, name: 'Aditya Jadhav' },
    { staffId: 693, name: 'Dev Jindal' },
    { staffId: 696, name: 'Kartikey Singh' },
    { staffId: 697, name: 'Sanket More' },
    { staffId: 698, name: 'Vedant Sanjay Shejwal' },
    { staffId: 699, name: 'Aniket Shashikant Thorat' },
    { staffId: 700, name: 'Geet Salame' },
    { staffId: 701, name: 'Diya Kantilal Dhumal' },
    { staffId: 702, name: 'Abhishek Vijay Tayde' },
    { staffId: 703, name: 'Tejas Kohade' },
    { staffId: 704, name: 'Atharva Ravikiran Dhoble' },
    { staffId: 707, name: 'Pranav More' },
    { staffId: 708, name: 'Neeraj Chavan' },
    { staffId: 709, name: 'Yash Yadav' },
    { staffId: 711, name: 'Yash Shah' },
    { staffId: 712, name: 'Himanshu Singh' },
    { staffId: 713, name: 'Raghini Trivedi' },
    { staffId: 714, name: 'Mohammed Naseer Uddin' },
    { staffId: 715, name: 'Roshan Jadhav' },
    { staffId: 716, name: 'Kartik Vora' },
    { staffId: 718, name: 'Shrey Nahar' },
    { staffId: 719, name: 'Aakanksha Bhaltadak' },
    { staffId: 721, name: 'Varun Jaiswal' },
    { staffId: 722, name: 'Ruchita Chavan' },
    { staffId: 105, name: 'Palak Sanghvi' },
    { staffId: 724, name: 'Bhavay Sehgal' },
    { staffId: 725, name: 'Vaishnavi Bhujbal' },
    { staffId: 728, name: 'Madhu Harsha' },
    { staffId: 730, name: 'Shreyash Adlinge' },
    { staffId: 731, name: 'Sandeep Vishwakarma' },
    { staffId: 732, name: 'Samarth Kanchan' },
    { staffId: 733, name: 'Rugvedi Ghule' },
    { staffId: 734, name: 'Sahil Patil' },
    { staffId: 736, name: 'Nikhil Agarwal' },
    { staffId: 737, name: 'Tanisha Agrawal' },
    { staffId: 738, name: 'Ashish Sitaram Chakkar' },
    { staffId: 739, name: 'Shalaka Deshpande' },
    { staffId: 741, name: 'Shravani Tammewar' },
    { staffId: 742, name: 'Sarina Khatri' },
    { staffId: 743, name: 'Palak Gupta' },
    { staffId: 744, name: 'Mayur Tingare' },
    { staffId: 745, name: 'Tanishq Chavan' },
    { staffId: 746, name: 'Omkar Salunke' },
    { staffId: 748, name: 'Palash Jamaiwar' },
    { staffId: 749, name: 'Harshesh Pote' },
    { staffId: 750, name: 'Anurag Kadu' },
    { staffId: 751, name: 'Rutuja Pohekar' },
    { staffId: 752, name: 'Chiraag Pandey' },
    { staffId: 753, name: 'Apurva Kamshetty' },
    { staffId: 754, name: 'Piyanshu Mohite' },
    { staffId: 757, name: 'Abhijit Pachpande' },
    { staffId: 758, name: 'Harsh Kushwah' },
    { staffId: 759, name: 'Mugdha Jiwane' },
    { staffId: 760, name: 'Bhagyashree Thakur' },
    { staffId: 761, name: 'Reshma Reddy' },
    { staffId: 763, name: 'Ashwini Dhole' },
    { staffId: 765, name: 'Rohit Owal' },
    { staffId: 767, name: 'Amitraj Jambure' },
    { staffId: 768, name: 'Vaishnavi Deshmukh' },
    { staffId: 561, name: 'Ashwini Kote' },
    { staffId: 770, name: 'Mangesh Metkar' },
    { staffId: 771, name: 'Prasoon Mangal' },
    { staffId: 772, name: 'Vaishali Rawat' },
    { staffId: 773, name: 'Harsh Raj' },
    { staffId: 774, name: 'Aroonay Anand' },
    { staffId: 777, name: 'Ayush Kotwalla' },
    { staffId: 778, name: 'Vishal Sadawarte' },
    { staffId: 779, name: 'Sharan Shetty' },
    { staffId: 780, name: 'Priyans Singh' },
    { staffId: 781, name: 'Nabin Kumar Bhakat' },
    { staffId: 782, name: 'Adarsh Shrivastava' },
    { staffId: 783, name: 'Akash Bawne' },
    { staffId: 784, name: 'Prajwal Nivangune' },
    { staffId: 785, name: 'Siddhi Algude' },
    { staffId: 786, name: 'Aamaan Sharma' },
    { staffId: 787, name: 'Vedant Gadekar' },
    { staffId: 788, name: 'Prathamesh Thorat' },
    { staffId: 789, name: 'Atharva Prabhune' },
    { staffId: 790, name: 'Kaustubh Sharma' },
    { staffId: 791, name: 'Aditya Navale' },
    { staffId: 792, name: 'Omkar Raje' },
    { staffId: 793, name: 'Rashi Agarwal' },
    { staffId: 794, name: 'Kratika Sharma' },
    { staffId: 796, name: 'Vaibhavi Wadje' },
    { staffId: 797, name: 'Deepak Kumar' },
    { staffId: 799, name: 'Akshata Shirke' },
    { staffId: 800, name: 'Rahul Mishra' },
    { staffId: 8001, name: 'Tushar Tomar' },
  ];

  const employeeData = employees.map((emp) => {
    const nameParts = emp.name.trim().split(' ');
    const lastName = nameParts[nameParts.length - 1];
    const firstName = nameParts.slice(0, -1).join(' ');
    const email = `${firstName.toLowerCase().replace(/\s+/g, '.')}.${lastName.toLowerCase()}@mindstix.com`;
    const employeeId = pad(emp.staffId, 4);

    return {
      employeeId,
      firstName,
      lastName,
      email,
      status: EmployeeStatus.ACTIVE,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    };
  });

  // Use createMany with skipDuplicates to avoid errors
  const result = await prisma.employee.createMany({
    data: employeeData,
    skipDuplicates: true,
  });

  console.log(`✅ Seeded ${result.count} employees from CSV`);
}

async function main() {
  try {
    await seedEmployeesFromCSV();
    console.log('🎉 Employee seeding completed successfully!');
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

