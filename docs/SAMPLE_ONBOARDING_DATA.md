# Sample Onboarding Data (Simplified Address Fields)

## 1️⃣ **Participant Onboarding**

### **Endpoint:** `POST /api/v1/users/participant/:participantId/onboarding`

### **Request Headers:**
```json
{
  "Authorization": "Bearer <participant_access_token>",
  "Content-Type": "application/json"
}
```

### **Request Body:**
```json
{
  "supportNeeds": [
    "68649df68e1a442c4e36c8bf",
    "68649e238e1a442c4e36c8c4",
    "68643c088e1a442c4e36c898"
  ],
  "emergencyContact": {
    "name": "Sarah Johnson",
    "relationship": "Mother",
    "phone": "+61412345678"
  },
  "planManager": {
    "name": "NDIS Care Coordinators Pty Ltd",
    "email": "admin@ndiscarecoord.com.au"
  },
  "coordinator": {
    "name": "Emily Roberts",
    "email": "emily.roberts@supportcoordination.com.au"
  },
  "preferredLanguages": ["English", "Mandarin"],
  "ndisNumber": "430123456789",
  "stateId": "690b0a037ee1cac861cb22df",
  "regionId": "690b0a067ee1cac861cb2315",
  "suburbId": "690b0a0d7ee1cac861cb2380",
  "serviceAreaId": "690b0a107ee1cac861cb2399",
  "location": {
    "longitude": 151.2093,
    "latitude": -33.8688
  },
  "address": "42 George Street, Sydney NSW 2000"
}
```

### **Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Participant onboarding completed successfully",
  "data": {
    "participant": {
      "_id": "681cbad018cb004b3456b166",
      "email": "john.smith@example.com",
      "firstName": "John",
      "lastName": "Smith",
      "role": "participant",
      "phone": "+61412345678",
      "onboardingComplete": true,
      "supportNeeds": [
        {
          "_id": "68649df68e1a442c4e36c8bf",
          "name": "Personal Care",
          "code": "PC01"
        },
        {
          "_id": "68649e238e1a442c4e36c8c4",
          "name": "Community Access",
          "code": "CA01"
        },
        {
          "_id": "68643c088e1a442c4e36c898",
          "name": "Transport",
          "code": "TR01"
        }
      ],
      "emergencyContact": {
        "name": "Sarah Johnson",
        "relationship": "Mother",
        "phone": "+61412345678"
      },
      "planManager": {
        "name": "NDIS Care Coordinators Pty Ltd",
        "email": "admin@ndiscarecoord.com.au"
      },
      "coordinator": {
        "name": "Emily Roberts",
        "email": "emily.roberts@supportcoordination.com.au"
      },
      "preferredLanguages": ["English", "Mandarin"],
      "ndisNumber": "430123456789",
      "stateId": {
        "_id": "690b0a037ee1cac861cb22df",
        "name": "New South Wales",
        "code": "NSW"
      },
      "regionId": {
        "_id": "690b0a067ee1cac861cb2315",
        "name": "Greater Sydney",
        "code": "GS"
      },
      "suburbId": {
        "_id": "690b0a0d7ee1cac861cb2380",
        "name": "Sydney",
        "postcode": "2000"
      },
      "serviceAreaId": {
        "_id": "690b0a107ee1cac861cb2399",
        "name": "Sydney Inner West",
        "code": "SYD-IW"
      },
      "participantLocation": {
        "type": "Point",
        "coordinates": [151.2093, -33.8688]
      },
      "address": "42 George Street, Sydney NSW 2000",
      "createdAt": "2024-11-05T09:25:52.370Z",
      "updatedAt": "2024-11-10T14:30:22.819Z"
    }
  }
}
```

---

## 2️⃣ **Support Worker Onboarding**

### **Endpoint:** `POST /api/v1/users/worker/:workerId/onboarding`

### **Request Headers:**
```json
{
  "Authorization": "Bearer <worker_access_token>",
  "Content-Type": "application/json"
}
```

### **Request Body:**
```json
{
  "bio": "Experienced NDIS support worker with over 6 years in the disability sector. Passionate about empowering participants to achieve their goals and live independently. Specialized in personal care, community access, and daily living support. Hold current First Aid, CPR, and Manual Handling certifications.",
  "skills": [
    "68649df68e1a442c4e36c8bf",
    "68649e238e1a442c4e36c8c4",
    "68643c088e1a442c4e36c898",
    "68649e0a8e1a442c4e36c8c0"
  ],
  "languages": ["English", "Spanish", "Italian"],
  "experience": [
    {
      "title": "Senior Support Worker",
      "organization": "CareConnect Services Pty Ltd",
      "startDate": "2020-03-15T00:00:00.000Z",
      "endDate": "2024-06-30T00:00:00.000Z",
      "description": "Provided comprehensive support to 12 NDIS participants including personal care, meal preparation, medication management, and community access. Specialized in working with clients with mobility challenges and complex care needs."
    },
    {
      "title": "Community Support Worker",
      "organization": "Ability Support Group",
      "startDate": "2018-01-10T00:00:00.000Z",
      "endDate": "2020-02-28T00:00:00.000Z",
      "description": "Assisted participants with daily living activities, social engagement, skill development, and community participation. Supported clients in achieving their NDIS plan goals."
    }
  ],
  "shiftRates": [
    {
      "rateTimeBandId": "6742xyz789abc456def01234",
      "hourlyRate": 45.50
    },
    {
      "rateTimeBandId": "6742xyz789abc456def01235",
      "hourlyRate": 52.00
    },
    {
      "rateTimeBandId": "6742xyz789abc456def01236",
      "hourlyRate": 68.25
    },
    {
      "rateTimeBandId": "6742xyz789abc456def01237",
      "hourlyRate": 95.50
    }
  ],
  "availability": {
    "weekdays": [
      {
        "day": "monday",
        "available": true,
        "slots": [
          {
            "start": "08:00",
            "end": "18:00"
          }
        ]
      },
      {
        "day": "tuesday",
        "available": true,
        "slots": [
          {
            "start": "08:00",
            "end": "18:00"
          }
        ]
      },
      {
        "day": "wednesday",
        "available": true,
        "slots": [
          {
            "start": "08:00",
            "end": "13:00"
          },
          {
            "start": "18:00",
            "end": "22:00"
          }
        ]
      },
      {
        "day": "thursday",
        "available": true,
        "slots": [
          {
            "start": "08:00",
            "end": "18:00"
          }
        ]
      },
      {
        "day": "friday",
        "available": true,
        "slots": [
          {
            "start": "08:00",
            "end": "18:00"
          }
        ]
      },
      {
        "day": "saturday",
        "available": true,
        "slots": [
          {
            "start": "09:00",
            "end": "17:00"
          }
        ]
      },
      {
        "day": "sunday",
        "available": false,
        "slots": []
      }
    ],
    "unavailableDates": [
      "2024-12-25T00:00:00.000Z",
      "2024-12-26T00:00:00.000Z",
      "2025-01-01T00:00:00.000Z",
      "2025-01-26T00:00:00.000Z"
    ]
  },
  "stateIds": [
    "690b0a037ee1cac861cb22df",
    "690b0a037ee1cac861cb22e0"
  ],
  "regionIds": [
    "690b0a067ee1cac861cb2315",
    "690b0a067ee1cac861cb2316",
    "690b0a067ee1cac861cb2317",
    "690b0a067ee1cac861cb2318"
  ],
  "serviceAreaIds": [
    "690b0a107ee1cac861cb2399",
    "690b0a107ee1cac861cb239a",
    "690b0a107ee1cac861cb239b",
    "690b0a107ee1cac861cb239c"
  ],
  "baseLocation": {
    "longitude": 151.0042,
    "latitude": -33.8151
  },
  "travelRadiusKm": 25,
  "address": "78 Church Street, Parramatta NSW 2150"
}
```

### **Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Worker onboarding completed successfully",
  "data": {
    "worker": {
      "_id": "682def018cb004b3456b789",
      "email": "maria.garcia@example.com",
      "firstName": "Maria",
      "lastName": "Garcia",
      "role": "supportWorker",
      "phone": "+61423456789",
      "bio": "Experienced NDIS support worker with over 6 years in the disability sector...",
      "skills": [
        {
          "_id": "68649df68e1a442c4e36c8bf",
          "name": "Personal Care",
          "code": "PC01"
        },
        {
          "_id": "68649e238e1a442c4e36c8c4",
          "name": "Community Access",
          "code": "CA01"
        },
        {
          "_id": "68643c088e1a442c4e36c898",
          "name": "Transport",
          "code": "TR01"
        },
        {
          "_id": "68649e0a8e1a442c4e36c8c0",
          "name": "Meal Preparation",
          "code": "MP01"
        }
      ],
      "languages": ["English", "Spanish", "Italian"],
      "experience": [
        {
          "title": "Senior Support Worker",
          "organization": "CareConnect Services Pty Ltd",
          "startDate": "2020-03-15T00:00:00.000Z",
          "endDate": "2024-06-30T00:00:00.000Z",
          "description": "Provided comprehensive support to 12 NDIS participants..."
        },
        {
          "title": "Community Support Worker",
          "organization": "Ability Support Group",
          "startDate": "2018-01-10T00:00:00.000Z",
          "endDate": "2020-02-28T00:00:00.000Z",
          "description": "Assisted participants with daily living activities..."
        }
      ],
      "shiftRates": [
        {
          "rateTimeBandId": {
            "_id": "6742xyz789abc456def01234",
            "name": "Weekday Day",
            "code": "WD",
            "startTime": "06:00",
            "endTime": "20:00"
          },
          "hourlyRate": 45.50
        },
        {
          "rateTimeBandId": {
            "_id": "6742xyz789abc456def01235",
            "name": "Weekday Evening",
            "code": "WE",
            "startTime": "20:00",
            "endTime": "06:00"
          },
          "hourlyRate": 52.00
        },
        {
          "rateTimeBandId": {
            "_id": "6742xyz789abc456def01236",
            "name": "Weekend",
            "code": "WK",
            "startTime": "00:00",
            "endTime": "23:59"
          },
          "hourlyRate": 68.25
        },
        {
          "rateTimeBandId": {
            "_id": "6742xyz789abc456def01237",
            "name": "Public Holiday",
            "code": "PH",
            "startTime": "00:00",
            "endTime": "23:59"
          },
          "hourlyRate": 95.50
        }
      ],
      "availability": {
        "weekdays": [
          {
            "day": "monday",
            "available": true,
            "slots": [{"start": "08:00", "end": "18:00"}]
          },
          {
            "day": "tuesday",
            "available": true,
            "slots": [{"start": "08:00", "end": "18:00"}]
          },
          {
            "day": "wednesday",
            "available": true,
            "slots": [
              {"start": "08:00", "end": "13:00"},
              {"start": "18:00", "end": "22:00"}
            ]
          },
          {
            "day": "thursday",
            "available": true,
            "slots": [{"start": "08:00", "end": "18:00"}]
          },
          {
            "day": "friday",
            "available": true,
            "slots": [{"start": "08:00", "end": "18:00"}]
          },
          {
            "day": "saturday",
            "available": true,
            "slots": [{"start": "09:00", "end": "17:00"}]
          },
          {
            "day": "sunday",
            "available": false,
            "slots": []
          }
        ],
        "unavailableDates": [
          "2024-12-25T00:00:00.000Z",
          "2024-12-26T00:00:00.000Z",
          "2025-01-01T00:00:00.000Z",
          "2025-01-26T00:00:00.000Z"
        ]
      },
      "stateIds": [
        {
          "_id": "690b0a037ee1cac861cb22df",
          "name": "New South Wales",
          "code": "NSW"
        },
        {
          "_id": "690b0a037ee1cac861cb22e0",
          "name": "Australian Capital Territory",
          "code": "ACT"
        }
      ],
      "regionIds": [
        {
          "_id": "690b0a067ee1cac861cb2315",
          "name": "Greater Sydney",
          "code": "GS"
        },
        {
          "_id": "690b0a067ee1cac861cb2316",
          "name": "Central Coast",
          "code": "CC"
        },
        {
          "_id": "690b0a067ee1cac861cb2317",
          "name": "Illawarra",
          "code": "ILL"
        },
        {
          "_id": "690b0a067ee1cac861cb2318",
          "name": "Hunter",
          "code": "HUN"
        }
      ],
      "serviceAreaIds": [
        {
          "_id": "690b0a107ee1cac861cb2399",
          "name": "Sydney Inner West",
          "code": "SYD-IW"
        },
        {
          "_id": "690b0a107ee1cac861cb239a",
          "name": "Sydney Eastern Suburbs",
          "code": "SYD-ES"
        },
        {
          "_id": "690b0a107ee1cac861cb239b",
          "name": "Sydney Northern Beaches",
          "code": "SYD-NB"
        },
        {
          "_id": "690b0a107ee1cac861cb239c",
          "name": "Sydney CBD",
          "code": "SYD-CBD"
        }
      ],
      "baseLocation": {
        "type": "Point",
        "coordinates": [151.0042, -33.8151]
      },
      "travelRadiusKm": 25,
      "address": "78 Church Street, Parramatta NSW 2150",
      "verificationStatus": {
        "profileSetupComplete": true,
        "onboardingComplete": true,
        "identityVerified": false,
        "policeCheckVerified": false,
        "ndisWorkerScreeningVerified": false
      },
      "ratings": {
        "average": 0,
        "count": 0
      },
      "createdAt": "2024-11-08T10:15:30.123Z",
      "updatedAt": "2024-11-10T14:45:18.456Z"
    }
  }
}
```

---

## 3️⃣ **Support Worker Search**

### **Endpoint:** `GET /api/v1/workers/search`

### **Request Headers:**
```json
{
  "Authorization": "Bearer <participant_access_token>"
}
```

### **Example Requests:**

#### **1. Basic Search with Skills**
```bash
GET /api/v1/workers/search?skills[]=68649df68e1a442c4e36c8bf&skills[]=68649e238e1a442c4e36c8c4&page=1&limit=10
```

#### **2. Location-Based Search (By Region)**
```bash
GET /api/v1/workers/search?regionId=690b0a067ee1cac861cb2315&minRating=4&page=1&limit=10
```

#### **3. Auto-Match Participant Location**
```bash
GET /api/v1/workers/search?matchParticipantLocation=true&skills[]=68649df68e1a442c4e36c8bf&onlyVerified=true&page=1&limit=10
```

#### **4. Combined Filters**
```bash
GET /api/v1/workers/search?stateId=690b0a037ee1cac861cb22df&skills[]=68649df68e1a442c4e36c8bf&languages[]=English&minRating=4.5&maxHourlyRate=55&availabilityDays[]=monday&availabilityDays[]=wednesday&keyword=experienced&onlyVerified=true&page=1&limit=10
```

### **Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Workers retrieved successfully",
  "data": {
    "workers": [
      {
        "_id": "682def018cb004b3456b789",
        "firstName": "Maria",
        "lastName": "Garcia",
        "profileImage": "https://res.cloudinary.com/dj8g798ed/image/upload/v1761470941/user-profiles/profile-682def018cb004b3456b789.jpg",
        "skills": [
          {
            "_id": "68649df68e1a442c4e36c8bf",
            "name": "Personal Care",
            "code": "PC01"
          },
          {
            "_id": "68649e238e1a442c4e36c8c4",
            "name": "Community Access",
            "code": "CA01"
          },
          {
            "_id": "68643c088e1a442c4e36c898",
            "name": "Transport",
            "code": "TR01"
          }
        ],
        "hourlyRate": {
          "baseRate": 45.50
        },
        "ratings": {
          "average": 4.8,
          "count": 23
        },
        "serviceAreas": ["Sydney", "Parramatta", "Central Coast"],
        "languages": ["English", "Spanish", "Italian"],
        "bio": "Experienced NDIS support worker with over 6 years in the disability sector. Passionate about empowering participants...",
        "verificationStatus": {
          "profileSetupComplete": true,
          "identityVerified": true,
          "policeCheckVerified": true,
          "ndisWorkerScreeningVerified": true
        },
        "isInUserOrganization": false,
        "stateIds": [
          {
            "_id": "690b0a037ee1cac861cb22df",
            "name": "New South Wales",
            "code": "NSW"
          }
        ],
        "regionIds": [
          {
            "_id": "690b0a067ee1cac861cb2315",
            "name": "Greater Sydney",
            "code": "GS"
          },
          {
            "_id": "690b0a067ee1cac861cb2316",
            "name": "Central Coast",
            "code": "CC"
          }
        ],
        "serviceAreaIds": [
          {
            "_id": "690b0a107ee1cac861cb2399",
            "name": "Sydney Inner West",
            "code": "SYD-IW"
          },
          {
            "_id": "690b0a107ee1cac861cb239a",
            "name": "Sydney Eastern Suburbs",
            "code": "SYD-ES"
          }
        ]
      },
      {
        "_id": "683abc125cb004b3456c890",
        "firstName": "David",
        "lastName": "Chen",
        "profileImage": "https://res.cloudinary.com/dj8g798ed/image/upload/v1761482345/user-profiles/profile-683abc125cb004b3456c890.jpg",
        "skills": [
          {
            "_id": "68649df68e1a442c4e36c8bf",
            "name": "Personal Care",
            "code": "PC01"
          },
          {
            "_id": "68649e0a8e1a442c4e36c8c0",
            "name": "Meal Preparation",
            "code": "MP01"
          }
        ],
        "hourlyRate": {
          "baseRate": 48.00
        },
        "ratings": {
          "average": 4.9,
          "count": 45
        },
        "serviceAreas": ["Sydney CBD", "Inner West", "Eastern Suburbs"],
        "languages": ["English", "Mandarin", "Cantonese"],
        "bio": "Dedicated support worker with 8 years of experience in personal care and community support. Fluent in English and Mandarin...",
        "verificationStatus": {
          "profileSetupComplete": true,
          "identityVerified": true,
          "policeCheckVerified": true,
          "ndisWorkerScreeningVerified": true
        },
        "isInUserOrganization": false,
        "stateIds": [
          {
            "_id": "690b0a037ee1cac861cb22df",
            "name": "New South Wales",
            "code": "NSW"
          }
        ],
        "regionIds": [
          {
            "_id": "690b0a067ee1cac861cb2315",
            "name": "Greater Sydney",
            "code": "GS"
          }
        ],
        "serviceAreaIds": [
          {
            "_id": "690b0a107ee1cac861cb239c",
            "name": "Sydney CBD",
            "code": "SYD-CBD"
          },
          {
            "_id": "690b0a107ee1cac861cb2399",
            "name": "Sydney Inner West",
            "code": "SYD-IW"
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalPages": 3,
      "totalResults": 27,
      "hasMore": true
    }
  }
}
```

---

## 📝 **Summary of Changes**

### **What Changed:**

✅ **Participant Model:**
- Changed `residentialAddress` (object) → `address` (string)
- Format: `"42 George Street, Sydney NSW 2000"`

✅ **Worker Model:**
- Changed `baseAddress` (object) → `address` (string)
- Format: `"78 Church Street, Parramatta NSW 2150"`

### **Benefits:**

1. **Simpler API** - Single string field instead of nested object
2. **Easier Frontend Integration** - Just one input field needed
3. **Flexible Format** - Users can enter address in any format they prefer
4. **Less Validation Required** - No need to validate individual address components
5. **Better UX** - Faster onboarding process

### **Example Address Formats (All Valid):**

```
"42 George Street, Sydney NSW 2000"
"Unit 5/123 Main Road, Parramatta 2150"
"78 Church St, Parramatta NSW 2150, Australia"
"Flat 2, 10 Park Avenue, Sydney"
"123 Queen Street, Melbourne VIC 3000"
```

---

## 🔄 **Migration Note**

If you have existing data with the old object format, you may want to create a migration script to combine the fields:

```javascript
// Example migration logic
const oldAddress = {
  street: "42 George Street",
  suburb: "Sydney",
  postcode: "2000",
  state: "NSW"
};

const newAddress = `${oldAddress.street}, ${oldAddress.suburb} ${oldAddress.state} ${oldAddress.postcode}`;
// Result: "42 George Street, Sydney NSW 2000"
```

---

## ✅ **Ready to Use**

All changes have been implemented and tested. No linter errors. The API is ready to accept the simplified address format! 🎉

