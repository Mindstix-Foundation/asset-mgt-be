# Email Format Examples

## 📧 Email Generation Format

All employee emails are generated using the format: `firstname.lastname@mindstix.com`

## 📝 Examples

| Staff ID | Full Name | First Name | Last Name | Email |
|----------|-----------|------------|-----------|-------|
| 1 | Roshan Kulkarni | Roshan | Kulkarni | roshan.kulkarni@mindstix.com |
| 22 | Hardik Patel | Hardik | Patel | hardik.patel@mindstix.com |
| 26 | Ashish Bhargava | Ashish | Bhargava | ashish.bhargava@mindstix.com |
| 34 | Ankur Mehta | Ankur | Mehta | ankur.mehta@mindstix.com |
| 197 | Niharika Katare | Niharika | Katare | niharika.katare@mindstix.com |
| 577 | Amogasiddha Vitthal Chougule | Amogasiddha Vitthal | Chougule | amogasiddha.vitthal.chougule@mindstix.com |
| 599 | Jayesh Dhanraj Jadhav | Jayesh Dhanraj | Jadhav | jayesh.dhanraj.jadhav@mindstix.com |
| 603 | Jitesh Chandrakant Dhumal | Jitesh Chandrakant | Dhumal | jitesh.chandrakant.dhumal@mindstix.com |
| 613 | L R T J NAIDU | L R T J | NAIDU | l.r.t.j.naidu@mindstix.com |
| 714 | Mohammed Naseer Uddin | Mohammed Naseer | Uddin | mohammed.naseer.uddin@mindstix.com |

## 🔧 Logic

1. Split full name by spaces
2. Last word = Last Name
3. Everything else = First Name
4. Email = `firstname.lowercase.with.dots` + `.` + `lastname.lowercase` + `@mindstix.com`

### Special Cases

- **Single word first names**: Simple join
  - "Hardik Patel" → "hardik.patel@mindstix.com"
  
- **Multi-word first names**: Words joined with dots
  - "Amogasiddha Vitthal Chougule" → "amogasiddha.vitthal.chougule@mindstix.com"
  
- **Spaces in names**: Replaced with dots
  - "Jayesh Dhanraj Jadhav" → "jayesh.dhanraj.jadhav@mindstix.com"
  
- **Uppercase names**: Converted to lowercase
  - "L R T J NAIDU" → "l.r.t.j.naidu@mindstix.com"

## ✅ All Emails Unique

The combination of first name and last name ensures unique email addresses for all 197 employees.

## 🎯 Implementation

The email generation is handled in `seed-employees-from-csv.ts`:

```typescript
const email = `${firstName.toLowerCase().replace(/\s+/g, '.')}.${lastName.toLowerCase()}@mindstix.com`;
```

This:
1. Converts first name to lowercase
2. Replaces all spaces with dots
3. Adds a dot separator
4. Adds lowercase last name
5. Adds domain `@mindstix.com`

