/**
 * Employee Attendance Management System - Database Layer
 * Handles LocalStorage interactions, data seeding, settings configurations, and data integrity.
 */

const AppDB = (() => {
  const STORAGE_KEY = 'emp_attendance_db';

  // Default system seed values
  const DEFAULT_DEPARTMENTS = [
    'IT & Engineering',
    'Human Resources',
    'Finance',
    'Sales & Marketing',
    'Operations'
  ];

  const DEFAULT_DESIGNATIONS = {
    'IT & Engineering': ['Software Engineer', 'Senior Developer', 'Tech Lead', 'QA Engineer', 'UI/UX Designer'],
    'Human Resources': ['HR Manager', 'Recruiter', 'HR Specialist'],
    'Finance': ['Financial Analyst', 'Accountant', 'Finance Manager'],
    'Sales & Marketing': ['Marketing Executive', 'Sales Manager', 'Content Strategist'],
    'Operations': ['Operations Manager', 'Coordinator', 'Support Specialist']
  };

  const DEFAULT_SETTINGS = {
    companyName: 'Antigravity Corp',
    companyLogo: '', // Base64 placeholder or SVG can be loaded
    workHours: {
      startTime: '09:00',
      endTime: '17:00',
      gracePeriod: 15 // Minutes
    },
    weekends: [0, 6], // 0 = Sunday, 6 = Saturday
    adminCredentials: {
      username: 'admin',
      password: 'admin123'
    }
  };

  // Helper placeholder profile avatars
  const DEFAULT_AVATARS = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256', // Female 1
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256', // Male 1
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=256', // Female 2
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=256', // Male 2
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=256', // Female 3
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=256'  // Male 3
  ];

  // Core schema structure
  let db = {
    employees: [],
    attendance: [],
    leaves: [],
    settings: { ...DEFAULT_SETTINGS },
    departments: [...DEFAULT_DEPARTMENTS],
    designations: { ...DEFAULT_DESIGNATIONS },
    activities: [] // Audit trail logs
  };

  // Save changes to localStorage
  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      console.error('LocalStorage save failed:', e);
    }
  };

  // Load from localStorage
  const load = () => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      try {
        db = JSON.parse(data);
        // Ensure backwards compatibility / missing keys
        if (!db.departments) db.departments = [...DEFAULT_DEPARTMENTS];
        if (!db.designations) db.designations = { ...DEFAULT_DESIGNATIONS };
        if (!db.activities) db.activities = [];
        if (!db.settings) db.settings = { ...DEFAULT_SETTINGS };
      } catch (e) {
        console.error('Failed to parse database. Initializing defaults.', e);
        initializeDefaults();
      }
    } else {
      initializeDefaults();
    }
  };

  // Log recent user/system activities
  const logActivity = (type, message, details = '') => {
    const activity = {
      id: 'ACT-' + Date.now() + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      type, // 'info', 'success', 'warning', 'danger'
      message,
      details
    };
    db.activities.unshift(activity);
    if (db.activities.length > 50) {
      db.activities.pop(); // Keep last 50 logs
    }
    save();
  };

  // Helper functions for seeding dates
  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const parseTime = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const formatTime = (minutes) => {
    const h = String(Math.floor(minutes / 60)).padStart(2, '0');
    const m = String(minutes % 60).padStart(2, '0');
    return `${h}:${m}`;
  };

  // Initialize and seed data
  const initializeDefaults = () => {
    db = {
      employees: [
        {
          id: 'EMP-1001',
          name: 'Sarah Connor',
          email: 'sarah.c@antigravity.corp',
          phone: '+1 (555) 019-2834',
          department: 'IT & Engineering',
          designation: 'Tech Lead',
          status: 'Active',
          photo: DEFAULT_AVATARS[0],
          joiningDate: '2023-01-15',
          dob: '1988-11-10'
        },
        {
          id: 'EMP-1002',
          name: 'Marcus Wright',
          email: 'marcus.w@antigravity.corp',
          phone: '+1 (555) 014-9821',
          department: 'IT & Engineering',
          designation: 'Senior Developer',
          status: 'Active',
          photo: DEFAULT_AVATARS[1],
          joiningDate: '2023-06-20',
          dob: '1990-05-14'
        },
        {
          id: 'EMP-1003',
          name: 'John Connor',
          email: 'john.c@antigravity.corp',
          phone: '+1 (555) 012-3456',
          department: 'IT & Engineering',
          designation: 'Software Engineer',
          status: 'Active',
          photo: DEFAULT_AVATARS[3],
          joiningDate: '2024-03-01',
          dob: '1995-02-28'
        },
        {
          id: 'EMP-1004',
          name: 'Kate Brewster',
          email: 'kate.b@antigravity.corp',
          phone: '+1 (555) 015-8941',
          department: 'Human Resources',
          designation: 'HR Manager',
          status: 'Active',
          photo: DEFAULT_AVATARS[2],
          joiningDate: '2022-09-10',
          dob: '1991-08-19'
        },
        {
          id: 'EMP-1005',
          name: 'Robert Brewster',
          email: 'robert.b@antigravity.corp',
          phone: '+1 (555) 017-4829',
          department: 'Operations',
          designation: 'Operations Manager',
          status: 'Active',
          photo: DEFAULT_AVATARS[5],
          joiningDate: '2021-04-05',
          dob: '1979-07-22'
        },
        {
          id: 'EMP-1006',
          name: 'T-800 CSM',
          email: 'cyberdyne@antigravity.corp',
          phone: '+1 (555) 101-0101',
          department: 'Finance',
          designation: 'Accountant',
          status: 'Active',
          photo: DEFAULT_AVATARS[4],
          joiningDate: '2025-01-01',
          dob: '1984-06-08'
        }
      ],
      attendance: [],
      leaves: [
        {
          id: 'LV-1001',
          employeeId: 'EMP-1002',
          leaveType: 'Casual',
          startDate: '2026-05-10',
          endDate: '2026-05-12',
          reason: 'Family gathering out of town',
          status: 'Approved',
          appliedDate: '2026-05-05'
        },
        {
          id: 'LV-1002',
          employeeId: 'EMP-1003',
          leaveType: 'Sick',
          startDate: '2026-05-25',
          endDate: '2026-05-25',
          reason: 'Severe dental checkup and rest',
          status: 'Approved',
          appliedDate: '2026-05-24'
        },
        {
          id: 'LV-1003',
          employeeId: 'EMP-1004',
          leaveType: 'Paid',
          startDate: '2026-06-15',
          endDate: '2026-06-18',
          reason: 'Annual vacation trip',
          status: 'Pending',
          appliedDate: '2026-06-03'
        }
      ],
      settings: { ...DEFAULT_SETTINGS },
      departments: [...DEFAULT_DEPARTMENTS],
      designations: { ...DEFAULT_DESIGNATIONS },
      activities: []
    };

    // Seed 30 days of attendance history up to yesterday
    const today = new Date();
    const workStartMins = parseTime(db.settings.workHours.startTime);
    const workEndMins = parseTime(db.settings.workHours.endTime);
    const gracePeriod = db.settings.workHours.gracePeriod;

    for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - dayOffset);
      const dateString = formatDate(targetDate);
      const dayOfWeek = targetDate.getDay();

      // Check settings for weekends (0 = Sun, 6 = Sat)
      const isWeekend = db.settings.weekends.includes(dayOfWeek);

      db.employees.forEach(emp => {
        // Active status filter (mock status verification)
        if (emp.status !== 'Active') return;

        // Check if there is an approved leave for this date
        const hasLeave = db.leaves.find(lv => 
          lv.employeeId === emp.id && 
          lv.status === 'Approved' && 
          dateString >= lv.startDate && 
          dateString <= lv.endDate
        );

        if (hasLeave) {
          db.attendance.push({
            date: dateString,
            employeeId: emp.id,
            status: 'Leave',
            checkIn: null,
            checkOut: null,
            isLate: false,
            isEarlyExit: false,
            notes: `Approved leave: ${hasLeave.leaveType}`
          });
          return;
        }

        if (isWeekend) {
          // Generally no attendance logged on weekends, but occasionally 10% WFH
          if (Math.random() < 0.1) {
            db.attendance.push({
              date: dateString,
              employeeId: emp.id,
              status: 'WFH',
              checkIn: '09:00',
              checkOut: '17:00',
              isLate: false,
              isEarlyExit: false,
              notes: 'Weekend Overtime WFH'
            });
          }
          return;
        }

        // Weekday Log Logic (90% attendance probability)
        const rand = Math.random();
        if (rand < 0.05) {
          // Absent
          db.attendance.push({
            date: dateString,
            employeeId: emp.id,
            status: 'Absent',
            checkIn: null,
            checkOut: null,
            isLate: false,
            isEarlyExit: false,
            notes: 'Unexcused absence'
          });
        } else if (rand < 0.12) {
          // Half Day (Late check in, say at 13:00)
          db.attendance.push({
            date: dateString,
            employeeId: emp.id,
            status: 'Half Day',
            checkIn: '13:00',
            checkOut: '17:00',
            isLate: true,
            isEarlyExit: false,
            notes: 'Doctor visit (Half Day)'
          });
        } else if (rand < 0.22) {
          // Work From Home (WFH)
          db.attendance.push({
            date: dateString,
            employeeId: emp.id,
            status: 'WFH',
            checkIn: '09:00',
            checkOut: '17:00',
            isLate: false,
            isEarlyExit: false,
            notes: 'Remote schedule'
          });
        } else {
          // Present (with random timings)
          // Average check-in around 8:45 to 9:20
          const checkInOffset = Math.floor(Math.random() * 45) - 20; // -20 to +25 minutes
          const checkInMins = workStartMins + checkInOffset;
          const isLate = checkInMins > (workStartMins + gracePeriod);

          // Average check-out around 16:45 to 17:30
          const checkOutOffset = Math.floor(Math.random() * 45) - 15; // -15 to +30 minutes
          const checkOutMins = workEndMins + checkOutOffset;
          const isEarly = checkOutMins < workEndMins;

          db.attendance.push({
            date: dateString,
            employeeId: emp.id,
            status: 'Present',
            checkIn: formatTime(checkInMins),
            checkOut: formatTime(checkOutMins),
            isLate,
            isEarlyExit: isEarly,
            notes: isLate ? 'Late entry' : (isEarly ? 'Early departure' : 'Standard shift')
          });
        }
      });
    }

    logActivity('success', 'System databases initialized and loaded with seed logs.');
    save();
  };

  // Perform immediate setup
  load();

  // Public Interface API
  return {
    // raw database getter for backup purposes
    getRawData: () => db,

    // Replace the database completely (used for Restore)
    restoreData: (newData) => {
      try {
        if (!newData.employees || !newData.attendance || !newData.settings) {
          throw new Error('Invalid database format.');
        }
        db = {
          employees: newData.employees || [],
          attendance: newData.attendance || [],
          leaves: newData.leaves || [],
          settings: { ...DEFAULT_SETTINGS, ...newData.settings },
          departments: newData.departments || [...DEFAULT_DEPARTMENTS],
          designations: newData.designations || { ...DEFAULT_DESIGNATIONS },
          activities: newData.activities || []
        };
        logActivity('success', 'Database restored successfully from file backup.');
        save();
        return true;
      } catch (err) {
        console.error('Database restore error:', err);
        return false;
      }
    },

    resetDatabase: () => {
      initializeDefaults();
    },

    // --- ACTIVITIES ---
    getActivities: () => db.activities,
    logActivity,

    // --- SETTINGS ---
    getSettings: () => db.settings,
    saveSettings: (newSettings) => {
      db.settings = { ...db.settings, ...newSettings };
      logActivity('info', 'System settings updated successfully.');
      save();
    },

    // --- DEPARTMENTS & DESIGNATIONS ---
    getDepartments: () => db.departments,
    addDepartment: (deptName) => {
      if (deptName && !db.departments.includes(deptName)) {
        db.departments.push(deptName);
        db.designations[deptName] = [];
        logActivity('success', `Created new department: ${deptName}`);
        save();
        return true;
      }
      return false;
    },
    getDesignations: (dept) => {
      return db.designations[dept] || [];
    },
    addDesignation: (dept, desigName) => {
      if (!db.designations[dept]) {
        db.designations[dept] = [];
      }
      if (desigName && !db.designations[dept].includes(desigName)) {
        db.designations[dept].push(desigName);
        logActivity('success', `Added designation: ${desigName} to ${dept}`);
        save();
        return true;
      }
      return false;
    },

    // --- EMPLOYEES CRUD ---
    getEmployees: () => db.employees,
    getEmployeeById: (id) => db.employees.find(emp => emp.id === id),
    generateEmployeeId: () => {
      if (db.employees.length === 0) return 'EMP-1001';
      const maxId = db.employees.reduce((max, emp) => {
        const num = parseInt(emp.id.replace('EMP-', ''), 10);
        return num > max ? num : max;
      }, 1000);
      return `EMP-${maxId + 1}`;
    },
    addEmployee: (employee) => {
      const id = AppDB.generateEmployeeId();
      const newEmp = {
        id,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        department: employee.department,
        designation: employee.designation,
        status: employee.status || 'Active',
        photo: employee.photo || '',
        joiningDate: employee.joiningDate || formatDate(new Date()),
        dob: employee.dob || ''
      };
      db.employees.push(newEmp);
      logActivity('success', `Employee ${newEmp.name} (${id}) added to rosters.`);
      save();
      return newEmp;
    },
    updateEmployee: (id, updatedEmp) => {
      const idx = db.employees.findIndex(emp => emp.id === id);
      if (idx !== -1) {
        db.employees[idx] = { ...db.employees[idx], ...updatedEmp };
        logActivity('info', `Employee details updated for ${db.employees[idx].name} (${id}).`);
        save();
        return db.employees[idx];
      }
      return null;
    },
    deleteEmployee: (id) => {
      const idx = db.employees.findIndex(emp => emp.id === id);
      if (idx !== -1) {
        const empName = db.employees[idx].name;
        db.employees.splice(idx, 1);
        // Cascading deletion is usually not ideal, but for simulation we clean up attendance
        db.attendance = db.attendance.filter(att => att.employeeId !== id);
        db.leaves = db.leaves.filter(lv => lv.employeeId !== id);
        logActivity('warning', `Deleted employee record: ${empName} (${id}).`);
        save();
        return true;
      }
      return false;
    },

    // --- ATTENDANCE MANAGEMENT ---
    getAttendanceByDate: (dateString) => {
      return db.attendance.filter(att => att.date === dateString);
    },
    getAttendanceHistory: () => db.attendance,
    markAttendance: (records) => {
      // records: Array of { date, employeeId, status, checkIn, checkOut, notes }
      const workStartMins = parseTime(db.settings.workHours.startTime);
      const workEndMins = parseTime(db.settings.workHours.endTime);
      const gracePeriod = db.settings.workHours.gracePeriod;

      records.forEach(rec => {
        let isLate = false;
        let isEarlyExit = false;

        // Calculate Late and Early Exit logic
        if (rec.status === 'Present' || rec.status === 'Half Day') {
          if (rec.checkIn) {
            const checkInMins = parseTime(rec.checkIn);
            isLate = checkInMins > (workStartMins + gracePeriod);
          }
          if (rec.checkOut) {
            const checkOutMins = parseTime(rec.checkOut);
            isEarlyExit = checkOutMins < workEndMins;
          }
        }

        // Upsert logic
        const idx = db.attendance.findIndex(att => att.date === rec.date && att.employeeId === rec.employeeId);
        const newRecord = {
          date: rec.date,
          employeeId: rec.employeeId,
          status: rec.status,
          checkIn: (rec.status === 'Present' || rec.status === 'Half Day' || rec.status === 'WFH') ? rec.checkIn : null,
          checkOut: (rec.status === 'Present' || rec.status === 'Half Day' || rec.status === 'WFH') ? rec.checkOut : null,
          isLate: (rec.status === 'Present' || rec.status === 'Half Day') ? isLate : false,
          isEarlyExit: (rec.status === 'Present' || rec.status === 'Half Day') ? isEarlyExit : false,
          notes: rec.notes || ''
        };

        if (idx !== -1) {
          db.attendance[idx] = newRecord;
        } else {
          db.attendance.push(newRecord);
        }
      });

      logActivity('success', `Attendance updated for ${records.length} employee(s) on ${records[0].date}.`);
      save();
    },

    // --- LEAVE MANAGEMENT ---
    getLeaves: () => db.leaves,
    generateLeaveId: () => {
      if (db.leaves.length === 0) return 'LV-1001';
      const maxId = db.leaves.reduce((max, lv) => {
        const num = parseInt(lv.id.replace('LV-', ''), 10);
        return num > max ? num : max;
      }, 1000);
      return `LV-${maxId + 1}`;
    },
    applyLeave: (leave) => {
      const id = AppDB.generateLeaveId();
      const newLeave = {
        id,
        employeeId: leave.employeeId,
        leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
        reason: leave.reason,
        status: 'Pending',
        appliedDate: formatDate(new Date())
      };
      db.leaves.push(newLeave);
      const emp = AppDB.getEmployeeById(leave.employeeId);
      logActivity('info', `${emp ? emp.name : 'Employee'} applied for ${leave.leaveType} leave from ${leave.startDate} to ${leave.endDate}.`);
      save();
      return newLeave;
    },
    updateLeaveStatus: (id, status) => {
      const idx = db.leaves.findIndex(lv => lv.id === id);
      if (idx !== -1) {
        db.leaves[idx].status = status;
        const emp = AppDB.getEmployeeById(db.leaves[idx].employeeId);
        logActivity(
          status === 'Approved' ? 'success' : 'danger', 
          `Leave request ${id} for ${emp ? emp.name : 'Employee'} was ${status}.`
        );

        // If Approved, automatically update attendance logs for those dates
        if (status === 'Approved') {
          const lv = db.leaves[idx];
          const start = new Date(lv.startDate);
          const end = new Date(lv.endDate);
          const attendanceUpdates = [];

          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = formatDate(d);
            
            // Avoid changing weekend records if settings doesn't log weekend attendance
            const isWeekend = db.settings.weekends.includes(d.getDay());
            if (isWeekend) continue;

            attendanceUpdates.push({
              date: dateStr,
              employeeId: lv.employeeId,
              status: 'Leave',
              checkIn: null,
              checkOut: null,
              notes: `Approved leave: ${lv.leaveType}`
            });
          }

          if (attendanceUpdates.length > 0) {
            AppDB.markAttendance(attendanceUpdates);
          }
        }
        
        save();
        return db.leaves[idx];
      }
      return null;
    },
    calculateLeaveBalances: (employeeId) => {
      // Mock allocations per leave type
      const ALLOCATIONS = {
        Casual: 12,
        Sick: 15,
        Paid: 20,
        Unpaid: 99
      };

      const balances = {
        Casual: { allocated: ALLOCATIONS.Casual, taken: 0, pending: 0 },
        Sick: { allocated: ALLOCATIONS.Sick, taken: 0, pending: 0 },
        Paid: { allocated: ALLOCATIONS.Paid, taken: 0, pending: 0 },
        Unpaid: { allocated: ALLOCATIONS.Unpaid, taken: 0, pending: 0 }
      };

      db.leaves.forEach(lv => {
        if (lv.employeeId !== employeeId) return;

        // Calculate days between start and end (inclusive)
        const start = new Date(lv.startDate);
        const end = new Date(lv.endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        if (lv.status === 'Approved') {
          if (balances[lv.leaveType]) balances[lv.leaveType].taken += diffDays;
        } else if (lv.status === 'Pending') {
          if (balances[lv.leaveType]) balances[lv.leaveType].pending += diffDays;
        }
      });

      return balances;
    }
  };
})();
