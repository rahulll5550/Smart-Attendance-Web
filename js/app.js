/**
 * Employee Attendance Management System - Application Controller Layer
 * Handles view routing, dynamic templates, Chart.js graphs, forms, events, and reports export.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Global View/Data State Variables
  let currentTab = 'dashboard';
  let activeEmployeePage = 1;
  const employeePageSize = 5;
  let employeeSearchQuery = '';
  let employeeDeptFilter = '';
  let employeeStatusFilter = '';
  let employeeSortCol = 0; // 0=ID, 1=Name, 2=Dept, 3=Desig, 5=JoiningDate, 6=Status
  let employeeSortDir = 'asc';

  let attendanceDate = formatDateString(new Date());
  let bulkSelectedEmployeeIds = [];

  let reportType = 'daily';
  let reportEmployeeId = '';
  let reportDept = '';
  let reportStartDate = formatDateString(new Date());
  let reportEndDate = formatDateString(new Date());
  let activeReportData = null; // Stored for exports

  // Chart instances trackers to avoid redraw conflicts
  let trendChartInstance = null;
  let statusChartInstance = null;

  // -------------------------------------------------------------
  // INITIALIZATION
  // -------------------------------------------------------------
  
  const initApp = () => {
    // Hide Loader
    setTimeout(() => {
      const loader = document.getElementById('app-loader');
      if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 500);
      }
    }, 600);

    // Apply Saved Theme
    const savedTheme = localStorage.getItem('emp_portal_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    // Check login state
    if (checkSession()) {
      showDashboardApp();
    } else {
      showLoginPage();
    }

    // Run real-time digital clock
    startClock();

    // Populate dropdowns across views
    populateDepartmentDropdowns();
    populateEmployeeDropdowns();
  };

  // -------------------------------------------------------------
  // HELPER UTILITIES
  // -------------------------------------------------------------
  
  function formatDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function startClock() {
    const clockEl = document.getElementById('live-clock');
    const updateTime = () => {
      const now = new Date();
      let h = now.getHours();
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      h = h ? h : 12; // hour '0' should be '12'
      const hStr = String(h).padStart(2, '0');
      
      if (clockEl) {
        clockEl.textContent = `${hStr}:${m}:${s} ${ampm}`;
      }
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  // Toast System
  const showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'warning') iconClass = 'fa-triangle-exclamation';
    if (type === 'danger') iconClass = 'fa-circle-xmark';

    toast.innerHTML = `
      <i class="fa-solid ${iconClass}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    // Fade out and remove
    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s ease reverse forwards';
      setTimeout(() => {
        if (toast.parentNode) {
          container.removeChild(toast);
        }
      }, 300);
    }, 4000);
  };

  // Global Modals Controller
  window.openModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  };

  window.closeModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  };

  // Confirmation Dialogue Modal
  const showConfirm = (title, message, onConfirm) => {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-title');
    const messageEl = document.getElementById('confirm-message');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    const okBtn = document.getElementById('confirm-ok-btn');

    if (!modal) return;

    titleEl.textContent = title;
    messageEl.textContent = message;

    const handleCancel = () => {
      closeModal('confirm-modal');
      cleanup();
    };

    const handleConfirm = () => {
      closeModal('confirm-modal');
      onConfirm();
      cleanup();
    };

    const cleanup = () => {
      cancelBtn.removeEventListener('click', handleCancel);
      okBtn.removeEventListener('click', handleConfirm);
    };

    cancelBtn.addEventListener('click', handleCancel);
    okBtn.addEventListener('click', handleConfirm);

    openModal('confirm-modal');
  };

  // File Upload Helper (converts image files to Base64 data url)
  const handlePhotoUpload = (fileInputId, previewImgId) => {
    const input = document.getElementById(fileInputId);
    const preview = document.getElementById(previewImgId);

    if (!input || !preview) return;

    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 512000) {
        showToast('Image file size exceeds the 500kb limit.', 'warning');
        input.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        preview.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  handlePhotoUpload('employee-photo-file', 'employee-photo-preview');
  handlePhotoUpload('settings-company-logo-file', 'company-logo-preview');

  // -------------------------------------------------------------
  // THEME SWITCHER
  // -------------------------------------------------------------
  
  const themeToggleBtn = document.getElementById('theme-toggle');
  const updateThemeIcon = (theme) => {
    const icon = themeToggleBtn.querySelector('i');
    if (theme === 'dark') {
      icon.className = 'fa-solid fa-sun';
    } else {
      icon.className = 'fa-solid fa-moon';
    }
  };

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const targetTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      document.documentElement.setAttribute('data-theme', targetTheme);
      localStorage.setItem('emp_portal_theme', targetTheme);
      updateThemeIcon(targetTheme);
      
      showToast(`Switched to ${targetTheme} mode.`, 'info');

      // Redraw charts if we are on dashboard tab to apply matching grid colors
      if (currentTab === 'dashboard') {
        renderDashboard();
      }
    });
  }

  // -------------------------------------------------------------
  // SESSION SECURITY MANAGEMENT
  // -------------------------------------------------------------
  
  const checkSession = () => {
    return sessionStorage.getItem('admin_logged_in') === 'true';
  };

  const showLoginPage = () => {
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('main-app-container').style.display = 'none';
  };

  const showDashboardApp = () => {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('main-app-container').style.display = 'flex';
    loadCompanySettings();
    renderTab(currentTab);
    loadNotificationsAndReminders();
  };

  const loadCompanySettings = () => {
    const settings = AppDB.getSettings();
    document.getElementById('sidebar-company-name').textContent = settings.companyName;
    
    const logoEl = document.getElementById('app-company-logo');
    if (settings.companyLogo) {
      logoEl.src = settings.companyLogo;
    } else {
      logoEl.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256';
    }
  };

  // Login Form Submission
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const usernameInput = document.getElementById('login-username').value.trim();
      const passwordInput = document.getElementById('login-password').value.trim();
      
      const credentials = AppDB.getSettings().adminCredentials;

      if (usernameInput === credentials.username && passwordInput === credentials.password) {
        sessionStorage.setItem('admin_logged_in', 'true');
        showToast('Login successful. Welcome admin!', 'success');
        showDashboardApp();
      } else {
        showToast('Invalid admin username or password.', 'danger');
      }
    });
  }

  // Logout Trigger
  const logoutTrigger = document.getElementById('logout-trigger');
  if (logoutTrigger) {
    logoutTrigger.addEventListener('click', () => {
      showConfirm('Confirm Logout', 'Are you sure you want to end your current session?', () => {
        sessionStorage.removeItem('admin_logged_in');
        showToast('Logged out of system successfully.', 'info');
        showLoginPage();
      });
    });
  }

  // -------------------------------------------------------------
  // TAB NAVIGATION & ROUTING
  // -------------------------------------------------------------
  
  const sidebarLinks = document.querySelectorAll('.sidebar-menu li');
  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.getAttribute('data-tab');
      if (target) {
        sidebarLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        renderTab(target);

        // Auto close mobile menu sidebar drawer if open
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('active')) {
          sidebar.classList.remove('active');
        }
      }
    });
  });

  // Mobile Hamburger Toggle
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      if (sidebar) {
        sidebar.classList.toggle('active');
      }
    });
  }

  // View sections toggle logic
  const renderTab = (tabName) => {
    currentTab = tabName;
    
    // Hide all views, display matching
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');

    switch (tabName) {
      case 'dashboard':
        document.getElementById('view-dashboard').classList.add('active');
        pageTitle.textContent = 'Dashboard Analytics';
        pageSubtitle.textContent = 'Real-time corporate attendance and status feeds';
        renderDashboard();
        break;
      case 'employees':
        document.getElementById('view-employees').classList.add('active');
        pageTitle.textContent = 'Employee Directory';
        pageSubtitle.textContent = 'Manage active personnel details and departments';
        renderEmployees();
        break;
      case 'attendance':
        document.getElementById('view-attendance').classList.add('active');
        pageTitle.textContent = 'Attendance Logger';
        pageSubtitle.textContent = 'Configure daily status logs and time entries';
        renderAttendance();
        break;
      case 'leaves':
        document.getElementById('view-leaves').classList.add('active');
        pageTitle.textContent = 'Leave Administration';
        pageSubtitle.textContent = 'Approve vacation requests and balance allocations';
        renderLeaves();
        break;
      case 'reports':
        document.getElementById('view-reports').classList.add('active');
        pageTitle.textContent = 'Reports & Data Exports';
        pageSubtitle.textContent = 'Query registers and export reports to PDF / Excel';
        renderReports();
        break;
      case 'settings':
        document.getElementById('view-settings').classList.add('active');
        pageTitle.textContent = 'System Preferences';
        pageSubtitle.textContent = 'Configure shift timings, weekends, backups, and security';
        renderSettings();
        break;
    }
  };

  // -------------------------------------------------------------
  // VIEW RENDERER 1: DASHBOARD
  // -------------------------------------------------------------
  
  const renderDashboard = () => {
    const employees = AppDB.getEmployees().filter(emp => emp.status === 'Active');
    const totalEmp = employees.length;

    // Get today's logs
    const todayStr = formatDateString(new Date());
    const todayLogs = AppDB.getAttendanceByDate(todayStr);

    let present = 0;
    let absent = 0;
    let late = 0;
    let wfh = 0;
    let leave = 0;
    let halfday = 0;

    todayLogs.forEach(log => {
      if (log.status === 'Present') present++;
      if (log.status === 'Absent') absent++;
      if (log.status === 'WFH') wfh++;
      if (log.status === 'Leave') leave++;
      if (log.status === 'Half Day') halfday++;
      if (log.isLate) late++;
    });

    // Handle initial state empty today's sheet
    // If today is empty, we estimate stats using the latest seeded records (yesterday) to show active visuals
    const defaultDataMsg = document.getElementById('dash-present-trend');
    if (todayLogs.length === 0) {
      // Find latest date in logs
      const history = AppDB.getAttendanceHistory();
      if (history.length > 0) {
        const uniqueDates = [...new Set(history.map(h => h.date))].sort((a,b) => b.localeCompare(a));
        const latestDate = uniqueDates[0];
        const latestLogs = history.filter(h => h.date === latestDate);
        
        present = latestLogs.filter(l => l.status === 'Present').length;
        absent = latestLogs.filter(l => l.status === 'Absent').length;
        wfh = latestLogs.filter(l => l.status === 'WFH').length;
        leave = latestLogs.filter(l => l.status === 'Leave').length;
        halfday = latestLogs.filter(l => l.status === 'Half Day').length;
        late = latestLogs.filter(l => l.isLate).length;
        if (defaultDataMsg) defaultDataMsg.innerHTML = `<i class="fa-solid fa-clock"></i> Visualizing latest logs: ${latestDate}`;
      }
    } else {
      if (defaultDataMsg) defaultDataMsg.innerHTML = `<i class="fa-solid fa-circle-check"></i> On Duty Today`;
    }

    // Set Text Values
    document.getElementById('dash-total-emp').textContent = totalEmp;
    document.getElementById('dash-present-today').textContent = present;
    document.getElementById('dash-absent-today').textContent = absent;
    document.getElementById('dash-late-today').textContent = late;
    document.getElementById('dash-wfh-today').textContent = wfh;
    document.getElementById('dash-leave-today').textContent = leave;
    document.getElementById('dash-halfday-today').textContent = halfday;

    const onDutyCount = present + wfh + halfday;
    const attPercentage = totalEmp > 0 ? Math.round((onDutyCount / totalEmp) * 100) : 0;
    document.getElementById('dash-att-percentage').textContent = `${attPercentage}%`;

    // Render Charts
    renderDashboardCharts(attPercentage, present, absent, wfh, leave, halfday);

    // Render Recent Activities list
    const logList = document.getElementById('activity-log-list');
    if (logList) {
      const activities = AppDB.getActivities().slice(0, 5);
      if (activities.length === 0) {
        logList.innerHTML = `<li style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 20px 0;">No activities logged.</li>`;
      } else {
        logList.innerHTML = activities.map(act => {
          let dotColor = 'var(--accent)';
          if (act.type === 'success') dotColor = 'var(--success)';
          if (act.type === 'warning') dotColor = 'var(--color-halfday)';
          if (act.type === 'danger') dotColor = 'var(--danger)';

          const timeStr = new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return `
            <li class="activity-item">
              <span class="activity-icon-bullet" style="background-color: ${dotColor}"></span>
              <div class="activity-content">
                <div>${act.message}</div>
                <span class="activity-time">${timeStr} - ${act.details || 'System'}</span>
              </div>
            </li>
          `;
        }).join('');
      }
    }
  };

  const renderDashboardCharts = (attRate, present, absent, wfh, leave, halfday) => {
    // Theme Colors configurations
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';
    const labelColor = isDark ? '#94a3b8' : '#64748b';

    // Chart 1: Bar Chart of attendance rates over the last 7 days
    const ctxTrend = document.getElementById('chart-attendance-trend');
    if (ctxTrend) {
      if (trendChartInstance) trendChartInstance.destroy();

      // Retrieve last 7 unique dates in history
      const history = AppDB.getAttendanceHistory();
      const uniqueDates = [...new Set(history.map(h => h.date))].sort().slice(-7);
      const activeEmpCount = AppDB.getEmployees().filter(e => e.status === 'Active').length;

      const labels = uniqueDates.map(date => {
        // Format to simple dd/mm
        const [y, m, d] = date.split('-');
        return `${d}/${m}`;
      });

      const dataPoints = uniqueDates.map(date => {
        const logs = history.filter(h => h.date === date);
        const presentCount = logs.filter(l => l.status === 'Present' || l.status === 'WFH' || l.status === 'Half Day').length;
        return activeEmpCount > 0 ? Math.round((presentCount / activeEmpCount) * 100) : 0;
      });

      trendChartInstance = new Chart(ctxTrend, {
        type: 'bar',
        data: {
          labels: labels.length > 0 ? labels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          datasets: [{
            label: 'Attendance Rate %',
            data: dataPoints.length > 0 ? dataPoints : [90, 95, 88, 92, 95],
            backgroundColor: 'rgba(59, 130, 246, 0.75)',
            borderColor: '#3b82f6',
            borderWidth: 1,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              grid: { color: gridColor },
              ticks: { color: labelColor }
            },
            x: {
              grid: { display: false },
              ticks: { color: labelColor }
            }
          }
        }
      });
    }

    // Chart 2: Doughnut Chart today's status breakdown
    const ctxStatus = document.getElementById('chart-status-pie');
    if (ctxStatus) {
      if (statusChartInstance) statusChartInstance.destroy();

      const noData = present === 0 && absent === 0 && wfh === 0 && leave === 0 && halfday === 0;

      statusChartInstance = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
          labels: ['Present', 'Absent', 'WFH', 'Leave', 'Half Day'],
          datasets: [{
            data: noData ? [1, 0, 0, 0, 0] : [present, absent, wfh, leave, halfday],
            backgroundColor: noData ? ['rgba(148, 163, 184, 0.2)'] : [
              '#10b981', // Present
              '#ef4444', // Absent
              '#06b6d4', // WFH
              '#8b5cf6', // Leave
              '#f59e0b'  // Half Day
            ],
            borderWidth: isDark ? 2 : 1,
            borderColor: isDark ? '#0f172a' : '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                color: labelColor,
                font: { family: 'Inter', size: 11 }
              }
            }
          },
          cutout: '70%'
        }
      });
    }
  };

  // Birthdays & work anniversary alerts renderer
  const loadNotificationsAndReminders = () => {
    const employees = AppDB.getEmployees().filter(emp => emp.status === 'Active');
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentDate = today.getDate();

    const remindersListEl = document.getElementById('reminder-log-list');
    const alertsDropdownEl = document.getElementById('dropdown-alerts-list');
    const alertDot = document.getElementById('birthday-alert-dot');

    let notifications = [];

    employees.forEach(emp => {
      // Birthdays check
      if (emp.dob) {
        const dobDate = new Date(emp.dob);
        if (dobDate.getMonth() === currentMonth) {
          const daysDiff = dobDate.getDate() - currentDate;
          if (daysDiff === 0) {
            notifications.push({
              emp,
              type: 'birthday',
              message: `Today is ${emp.name}'s Birthday! 🎂`,
              badgeText: 'Today',
              class: 'bg-bday'
            });
          } else if (daysDiff > 0 && daysDiff <= 7) {
            notifications.push({
              emp,
              type: 'birthday',
              message: `Upcoming Birthday: ${emp.name} on ${dobDate.getDate()} ${dobDate.toLocaleString('default', { month: 'short' })}`,
              badgeText: `In ${daysDiff} days`,
              class: 'bg-bday'
            });
          }
        }
      }

      // Work Anniversaries check
      if (emp.joiningDate) {
        const join = new Date(emp.joiningDate);
        if (join.getMonth() === currentMonth && join.getDate() === currentDate) {
          const years = today.getFullYear() - join.getFullYear();
          if (years > 0) {
            notifications.push({
              emp,
              type: 'anniversary',
              message: `${emp.name} completes ${years} year(s) at Company! 🏆`,
              badgeText: 'Anniversary',
              class: 'bg-anniv'
            });
          }
        }
      }
    });

    // Update notification icon badge dot
    if (alertDot) {
      alertDot.style.display = notifications.length > 0 ? 'block' : 'none';
    }

    // Render Dropdown List
    if (alertsDropdownEl) {
      if (notifications.length === 0) {
        alertsDropdownEl.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 10px 0;">No new alerts today.</div>`;
      } else {
        alertsDropdownEl.innerHTML = notifications.map(n => `
          <div class="birthday-item" style="padding: 6px 8px;">
            <div class="birthday-user">
              <img src="${n.emp.photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256'}" class="birthday-avatar" alt="Avatar">
              <div class="birthday-text">
                <span class="birthday-name" style="font-size: 0.8rem;">${n.message}</span>
              </div>
            </div>
          </div>
        `).join('');
      }
    }

    // Render Dashboard Reminders pane
    if (remindersListEl) {
      if (notifications.length === 0) {
        remindersListEl.innerHTML = `
          <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; color: var(--text-muted);">
            <i class="fa-solid fa-gift" style="font-size: 2.5rem; margin-bottom: 12px; opacity: 0.3;"></i>
            <span style="font-size: 0.85rem;">No upcoming celebrations this week.</span>
          </div>
        `;
      } else {
        remindersListEl.innerHTML = notifications.map(n => `
          <div class="birthday-item">
            <div class="birthday-user">
              <img src="${n.emp.photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256'}" class="birthday-avatar" alt="User image">
              <div class="birthday-text">
                <span class="birthday-name">${n.emp.name}</span>
                <span class="birthday-sub">${n.emp.department} - ${n.emp.designation}</span>
              </div>
            </div>
            <span class="birthday-tag ${n.class}">${n.badgeText}</span>
          </div>
        `).join('');
      }
    }
  };

  // Toggle birthday alert dropdown popup bubble
  const bdayAlertsToggle = document.getElementById('birthday-alerts-toggle');
  const bdayDropdown = document.getElementById('birthday-alerts-dropdown');
  if (bdayAlertsToggle && bdayDropdown) {
    bdayAlertsToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const show = bdayDropdown.style.display === 'block';
      bdayDropdown.style.display = show ? 'none' : 'block';
    });

    document.addEventListener('click', () => {
      bdayDropdown.style.display = 'none';
    });
  }

  // -------------------------------------------------------------
  // VIEW RENDERER 2: EMPLOYEE MANAGEMENT
  // -------------------------------------------------------------
  
  const searchInput = document.getElementById('search-emp-input');
  const deptFilter = document.getElementById('filter-emp-dept');
  const statusFilter = document.getElementById('filter-emp-status');

  const triggerEmployeeSearch = () => {
    employeeSearchQuery = searchInput.value.toLowerCase().trim();
    activeEmployeePage = 1; // Reset to page 1
    renderEmployees();
  };

  if (searchInput) searchInput.addEventListener('input', triggerEmployeeSearch);
  if (deptFilter) {
    deptFilter.addEventListener('change', () => {
      employeeDeptFilter = deptFilter.value;
      activeEmployeePage = 1;
      renderEmployees();
    });
  }
  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      employeeStatusFilter = statusFilter.value;
      activeEmployeePage = 1;
      renderEmployees();
    });
  }

  // Employee Add trigger modal
  const addEmpTrigger = document.getElementById('add-employee-trigger');
  if (addEmpTrigger) {
    addEmpTrigger.addEventListener('click', () => {
      document.getElementById('employee-form').reset();
      document.getElementById('employee-form-id').value = '';
      document.getElementById('employee-modal-title').textContent = 'Add New Employee';
      document.getElementById('employee-submit-btn').textContent = 'Save Employee';
      document.getElementById('employee-photo-preview').src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256';
      
      // Auto pre-populate default dates
      document.getElementById('employee-joining').value = formatDateString(new Date());

      openModal('employee-modal');
    });
  }

  const renderEmployees = () => {
    let list = AppDB.getEmployees();

    // Search query match
    if (employeeSearchQuery) {
      list = list.filter(emp => 
        emp.name.toLowerCase().includes(employeeSearchQuery) || 
        emp.id.toLowerCase().includes(employeeSearchQuery) || 
        emp.email.toLowerCase().includes(employeeSearchQuery)
      );
    }

    // Department match
    if (employeeDeptFilter) {
      list = list.filter(emp => emp.department === employeeDeptFilter);
    }

    // Status match
    if (employeeStatusFilter) {
      list = list.filter(emp => emp.status === employeeStatusFilter);
    }

    // Sort order
    list.sort((a, b) => {
      let valA, valB;
      switch (employeeSortCol) {
        case 0: // ID
          valA = parseInt(a.id.replace('EMP-', ''), 10);
          valB = parseInt(b.id.replace('EMP-', ''), 10);
          break;
        case 1: // Name
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 2: // Department
          valA = a.department.toLowerCase();
          valB = b.department.toLowerCase();
          break;
        case 3: // Designation
          valA = a.designation.toLowerCase();
          valB = b.designation.toLowerCase();
          break;
        case 5: // JoiningDate
          valA = a.joiningDate;
          valB = b.joiningDate;
          break;
        case 6: // Status
          valA = a.status.toLowerCase();
          valB = b.status.toLowerCase();
          break;
        default:
          valA = a.id;
          valB = b.id;
      }

      if (valA < valB) return employeeSortDir === 'asc' ? -1 : 1;
      if (valA > valB) return employeeSortDir === 'asc' ? 1 : -1;
      return 0;
    });

    // Pagination calculations
    const totalRecords = list.length;
    const totalPages = Math.ceil(totalRecords / employeePageSize) || 1;
    if (activeEmployeePage > totalPages) activeEmployeePage = totalPages;

    const startIdx = (activeEmployeePage - 1) * employeePageSize;
    const endIdx = Math.min(startIdx + employeePageSize, totalRecords);
    const paginatedList = list.slice(startIdx, endIdx);

    // Render Table Rows
    const tbody = document.getElementById('employees-table-body');
    if (tbody) {
      if (paginatedList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 40px 0;">No employee records found matching filter criteria.</td></tr>`;
      } else {
        tbody.innerHTML = paginatedList.map(emp => {
          const badgeClass = emp.status === 'Active' ? 'badge-active' : 'badge-inactive';
          return `
            <tr>
              <td><span class="user-cell"><strong class="id-tag">${emp.id}</strong></span></td>
              <td>
                <div class="user-cell">
                  <img src="${emp.photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256'}" alt="Avatar">
                  <div>
                    <div class="name">${emp.name}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">DOB: ${emp.dob || 'Not set'}</div>
                  </div>
                </div>
              </td>
              <td>${emp.department}</td>
              <td>${emp.designation}</td>
              <td>
                <div style="font-size: 0.85rem;">
                  <div><i class="fa-solid fa-envelope" style="color: var(--text-muted); width: 14px;"></i> ${emp.email}</div>
                  <div><i class="fa-solid fa-phone" style="color: var(--text-muted); width: 14px;"></i> ${emp.phone}</div>
                </div>
              </td>
              <td>${emp.joiningDate}</td>
              <td><span class="badge ${badgeClass}">${emp.status}</span></td>
              <td>
                <div class="table-actions">
                  <button class="action-btn edit" onclick="window.editEmployee('${emp.id}')" title="Edit Roster"><i class="fa-solid fa-pencil"></i></button>
                  <button class="action-btn delete" onclick="window.deleteEmployee('${emp.id}')" title="Remove Employee"><i class="fa-solid fa-trash"></i></button>
                </div>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // Render Pagination Text
    const infoEl = document.getElementById('emp-pagination-info');
    if (infoEl) {
      if (totalRecords === 0) {
        infoEl.textContent = 'Showing 0 to 0 of 0 entries';
      } else {
        infoEl.textContent = `Showing ${startIdx + 1} to ${endIdx} of ${totalRecords} entries`;
      }
    }

    // Render Pagination Buttons
    const btnsEl = document.getElementById('emp-pagination-buttons');
    if (btnsEl) {
      let html = `<button class="page-btn" ${activeEmployeePage === 1 ? 'disabled' : ''} onclick="window.changeEmployeePage(${activeEmployeePage - 1})"><i class="fa-solid fa-angle-left"></i></button>`;
      
      for (let i = 1; i <= totalPages; i++) {
        html += `<button class="page-btn ${activeEmployeePage === i ? 'active' : ''}" onclick="window.changeEmployeePage(${i})">${i}</button>`;
      }

      html += `<button class="page-btn" ${activeEmployeePage === totalPages ? 'disabled' : ''} onclick="window.changeEmployeePage(${activeEmployeePage + 1})"><i class="fa-solid fa-angle-right"></i></button>`;
      btnsEl.innerHTML = html;
    }
  };

  window.changeEmployeePage = (page) => {
    activeEmployeePage = page;
    renderEmployees();
  };

  // Table sorting triggers
  window.sortTable = (context, colIndex) => {
    if (context === 'employees') {
      if (employeeSortCol === colIndex) {
        employeeSortDir = employeeSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        employeeSortCol = colIndex;
        employeeSortDir = 'asc';
      }
      
      // Update arrows indicator visual inside table headers (usually handled by rendering table again)
      renderEmployees();
    }
  };

  // Employee CRUD Modal Save
  const employeeForm = document.getElementById('employee-form');
  if (employeeForm) {
    employeeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const empId = document.getElementById('employee-form-id').value;
      const data = {
        name: document.getElementById('employee-name').value.trim(),
        email: document.getElementById('employee-email').value.trim(),
        phone: document.getElementById('employee-phone').value.trim(),
        dob: document.getElementById('employee-dob').value,
        department: document.getElementById('employee-dept').value,
        designation: document.getElementById('employee-designation').value,
        joiningDate: document.getElementById('employee-joining').value,
        status: document.getElementById('employee-status').value,
        photo: document.getElementById('employee-photo-preview').src
      };

      if (empId) {
        // Edit Mode
        AppDB.updateEmployee(empId, data);
        showToast('Employee roster details updated.', 'success');
      } else {
        // Create Mode
        AppDB.addEmployee(data);
        showToast('Created new employee registry entry.', 'success');
      }

      closeModal('employee-modal');
      renderEmployees();
      populateEmployeeDropdowns(); // Refresh lists elsewhere
    });
  }

  // Employee Edit Actions Trigger
  window.editEmployee = (id) => {
    const emp = AppDB.getEmployeeById(id);
    if (!emp) return;

    document.getElementById('employee-modal-title').textContent = `Edit Details: ${emp.name}`;
    document.getElementById('employee-form-id').value = emp.id;
    
    document.getElementById('employee-name').value = emp.name;
    document.getElementById('employee-email').value = emp.email;
    document.getElementById('employee-phone').value = emp.phone;
    document.getElementById('employee-dob').value = emp.dob;
    
    // Set dept and trigger designation options load
    document.getElementById('employee-dept').value = emp.department;
    updateDesignationOptions('employee-dept', 'employee-designation', emp.designation);
    
    document.getElementById('employee-joining').value = emp.joiningDate;
    document.getElementById('employee-status').value = emp.status;

    if (emp.photo) {
      document.getElementById('employee-photo-preview').src = emp.photo;
    } else {
      document.getElementById('employee-photo-preview').src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256';
    }

    document.getElementById('employee-submit-btn').textContent = 'Update Profile';
    openModal('employee-modal');
  };

  // Employee Delete Action Trigger
  window.deleteEmployee = (id) => {
    const emp = AppDB.getEmployeeById(id);
    if (!emp) return;

    showConfirm(
      'Remove Employee?', 
      `Are you sure you want to delete ${emp.name} (${emp.id})? All historic logs for attendance and leave requests will be lost.`,
      () => {
        AppDB.deleteEmployee(id);
        showToast(`Successfully deleted employee record: ${emp.name}`, 'success');
        renderEmployees();
        populateEmployeeDropdowns();
      }
    );
  };

  // Department designations cascade selector trigger helper
  const deptSelect = document.getElementById('employee-dept');
  const desigSelect = document.getElementById('employee-designation');

  const updateDesignationOptions = (deptSelectId, desigSelectId, selectedDesig = '') => {
    const deptVal = document.getElementById(deptSelectId).value;
    const desigSelectEl = document.getElementById(desigSelectId);

    if (!desigSelectEl) return;

    if (!deptVal) {
      desigSelectEl.innerHTML = `<option value="">Select Department first...</option>`;
      desigSelectEl.disabled = true;
    } else {
      const designations = AppDB.getDesignations(deptVal);
      desigSelectEl.innerHTML = designations.map(d => `<option value="${d}">${d}</option>`).join('');
      desigSelectEl.disabled = false;
      
      if (selectedDesig) {
        desigSelectEl.value = selectedDesig;
      }
    }
  };

  if (deptSelect) {
    deptSelect.addEventListener('change', () => updateDesignationOptions('employee-dept', 'employee-designation'));
  }

  // -------------------------------------------------------------
  // VIEW RENDERER 3: ATTENDANCE LOGGER
  // -------------------------------------------------------------
  
  // -------------------------------------------------------------
  // VIEW RENDERER 3: ATTENDANCE LOGGER
  // -------------------------------------------------------------
  
  let calMonth = new Date().getMonth();
  let calYear = new Date().getFullYear();
  let calEmployeeId = '';

  const attTabSheet = document.getElementById('att-tab-sheet');
  const attTabCalendar = document.getElementById('att-tab-calendar');
  const attSheetPane = document.getElementById('att-sheet-pane');
  const attCalendarPane = document.getElementById('att-calendar-pane');

  if (attTabSheet && attTabCalendar) {
    attTabSheet.addEventListener('click', () => {
      attTabSheet.className = 'btn btn-primary';
      attTabCalendar.className = 'btn btn-secondary';
      attSheetPane.style.display = 'block';
      attCalendarPane.style.display = 'none';
      renderAttendance();
    });

    attTabCalendar.addEventListener('click', () => {
      attTabCalendar.className = 'btn btn-primary';
      attTabSheet.className = 'btn btn-secondary';
      attSheetPane.style.display = 'none';
      attCalendarPane.style.display = 'block';
      
      // Auto select first employee if none selected
      const empSelect = document.getElementById('att-calendar-emp-select');
      if (empSelect && !calEmployeeId) {
        const activeEmps = AppDB.getEmployees().filter(e => e.status === 'Active');
        if (activeEmps.length > 0) {
          calEmployeeId = activeEmps[0].id;
          empSelect.value = calEmployeeId;
        }
      }
      renderAttendanceCalendar();
    });
  }

  // Set selectors defaults
  const calMonthSelect = document.getElementById('att-calendar-month-select');
  const calYearSelect = document.getElementById('att-calendar-year-select');
  const calEmpSelect = document.getElementById('att-calendar-emp-select');

  if (calMonthSelect) {
    calMonthSelect.value = calMonth;
    calMonthSelect.addEventListener('change', () => {
      calMonth = parseInt(calMonthSelect.value, 10);
      renderAttendanceCalendar();
    });
  }
  if (calYearSelect) {
    calYearSelect.value = calYear;
    calYearSelect.addEventListener('change', () => {
      calYear = parseInt(calYearSelect.value, 10) || new Date().getFullYear();
      renderAttendanceCalendar();
    });
  }
  if (calEmpSelect) {
    calEmpSelect.addEventListener('change', () => {
      calEmployeeId = calEmpSelect.value;
      renderAttendanceCalendar();
    });
  }

  const renderAttendanceCalendar = () => {
    const container = document.getElementById('calendar-days-container');
    if (!container) return;

    if (!calEmployeeId) {
      container.innerHTML = `<div style="grid-column: span 7; text-align: center; color: var(--text-muted); padding: 40px 0;">Please select an employee to visualize the monthly attendance history calendar.</div>`;
      return;
    }

    // Calculate details for calendar building
    const firstDay = new Date(calYear, calMonth, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sun, 6 = Sat
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    
    const settings = AppDB.getSettings();
    const history = AppDB.getAttendanceHistory();

    let daysHtml = '';

    // 1. Previous Month Buffer Days
    for (let i = 0; i < startDayOfWeek; i++) {
      daysHtml += `<div class="calendar-day-box" style="opacity: 0.35; background: transparent;"><span class="calendar-day-num">-</span></div>`;
    }

    // 2. Main Month Days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const log = history.find(h => h.employeeId === calEmployeeId && h.date === dateString);
      const isWeekend = settings.weekends.includes(new Date(calYear, calMonth, day).getDay());

      let statusColor = 'var(--text-muted)';
      let label = isWeekend ? 'Weekend Off' : 'Not Marked';
      let detailsHtml = '';

      if (log) {
        label = log.status;
        if (log.status === 'Present') statusColor = 'var(--color-present)';
        if (log.status === 'Absent') statusColor = 'var(--color-absent)';
        if (log.status === 'Half Day') statusColor = 'var(--color-halfday)';
        if (log.status === 'Leave') statusColor = 'var(--color-leave)';
        if (log.status === 'WFH') statusColor = 'var(--color-wfh)';

        if (log.checkIn || log.checkOut) {
          detailsHtml = `<div style="font-size: 0.65rem; color: var(--text-secondary); margin-top: 4px;">
            ${log.checkIn || ''} - ${log.checkOut || ''}
          </div>`;
        }
      } else if (isWeekend) {
        statusColor = 'rgba(var(--accent-rgb), 0.2)';
      }

      const statusDot = `<i class="fa-solid fa-circle" style="color: ${statusColor}; font-size: 0.55rem; margin-right: 4px;"></i>`;

      daysHtml += `
        <div class="calendar-day-box glass" style="border-left: 3px solid ${statusColor};" title="${dateString}: ${label}">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="calendar-day-num">${day}</span>
            <span style="font-size: 0.65rem; font-weight: 600; color: ${statusColor}">${label}</span>
          </div>
          <div class="calendar-day-content">
            ${detailsHtml}
          </div>
        </div>
      `;
    }

    container.innerHTML = daysHtml;
  };

  const attDateSelector = document.getElementById('attendance-date-select');
  if (attDateSelector) {
    attDateSelector.value = attendanceDate;
    attDateSelector.addEventListener('change', () => {
      attendanceDate = attDateSelector.value;
      bulkSelectedEmployeeIds = [];
      document.getElementById('select-all-att-checkbox').checked = false;
      document.getElementById('bulk-attendance-bar').style.display = 'none';
      renderAttendance();
    });
  }

  const renderAttendance = () => {
    const employees = AppDB.getEmployees().filter(emp => emp.status === 'Active');
    const logs = AppDB.getAttendanceByDate(attendanceDate);
    const settings = AppDB.getSettings();

    // Calculate Today status summaries counters
    let countPresent = 0;
    let countAbsent = 0;
    let countHalfDay = 0;
    let countLeave = 0;
    let countWfh = 0;

    logs.forEach(l => {
      if (l.status === 'Present') countPresent++;
      if (l.status === 'Absent') countAbsent++;
      if (l.status === 'Half Day') countHalfDay++;
      if (l.status === 'Leave') countLeave++;
      if (l.status === 'WFH') countWfh++;
    });

    document.getElementById('att-cnt-present').textContent = countPresent;
    document.getElementById('att-cnt-absent').textContent = countAbsent;
    document.getElementById('att-cnt-halfday').textContent = countHalfDay;
    document.getElementById('att-cnt-leave').textContent = countLeave;
    document.getElementById('att-cnt-wfh').textContent = countWfh;

    // Render Rows
    const tbody = document.getElementById('attendance-table-body');
    if (tbody) {
      if (employees.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px 0; color: var(--text-muted);">No active employees in roster. Create employees first.</td></tr>`;
        return;
      }

      tbody.innerHTML = employees.map(emp => {
        // Find existing record
        const rec = logs.find(l => l.employeeId === emp.id);
        const status = rec ? rec.status : 'Present'; // Present by default
        const checkIn = rec ? (rec.checkIn || '') : settings.workHours.startTime;
        const checkOut = rec ? (rec.checkOut || '') : settings.workHours.endTime;
        const notes = rec ? (rec.notes || '') : '';
        const isLate = rec ? rec.isLate : false;
        const isEarly = rec ? rec.isEarlyExit : false;

        const isChecked = bulkSelectedEmployeeIds.includes(emp.id) ? 'checked' : '';

        // Status flags badges HTML
        let flagsHtml = '';
        if (isLate) flagsHtml += `<span class="badge badge-late">Late Entry</span> `;
        if (isEarly) flagsHtml += `<span class="badge badge-halfday">Early Exit</span>`;
        if (!isLate && !isEarly && (status === 'Present' || status === 'WFH')) {
          flagsHtml += `<span class="badge badge-present">On Time</span>`;
        }

        const isTimingsDisabled = (status === 'Absent' || status === 'Leave') ? 'disabled' : '';

        return `
          <tr data-emp-id="${emp.id}">
            <td style="text-align: center;">
              <input type="checkbox" class="att-row-checkbox" value="${emp.id}" ${isChecked}>
            </td>
            <td>
              <div class="user-cell">
                <img src="${emp.photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256'}" alt="Photo">
                <div>
                  <div class="name">${emp.name}</div>
                  <strong class="id-tag">${emp.id}</strong> | <span style="font-size: 0.75rem; color: var(--text-secondary);">${emp.department}</span>
                </div>
              </div>
            </td>
            <td>
              <select class="form-control att-status-select" style="padding: 6px 12px; font-size: 0.85rem;" onchange="window.handleAttStatusChange('${emp.id}', this.value)">
                <option value="Present" ${status === 'Present' ? 'selected' : ''}>Present</option>
                <option value="Absent" ${status === 'Absent' ? 'selected' : ''}>Absent</option>
                <option value="Half Day" ${status === 'Half Day' ? 'selected' : ''}>Half Day</option>
                <option value="Leave" ${status === 'Leave' ? 'selected' : ''}>Leave</option>
                <option value="WFH" ${status === 'WFH' ? 'selected' : ''}>Work From Home</option>
              </select>
            </td>
            <td>
              <input type="time" class="form-control att-checkin-input" value="${checkIn}" ${isTimingsDisabled} style="padding: 6px 8px; font-size: 0.85rem;" onchange="window.handleAttTimingsChange('${emp.id}')">
            </td>
            <td>
              <input type="time" class="form-control att-checkout-input" value="${checkOut}" ${isTimingsDisabled} style="padding: 6px 8px; font-size: 0.85rem;" onchange="window.handleAttTimingsChange('${emp.id}')">
            </td>
            <td>
              <input type="text" class="form-control att-notes-input" value="${notes}" placeholder="Optional memo" style="padding: 6px 8px; font-size: 0.85rem;">
            </td>
            <td class="att-flags-cell">
              ${flagsHtml}
            </td>
          </tr>
        `;
      }).join('');

      // Re-register inline row checkbox events
      const checkboxes = tbody.querySelectorAll('.att-row-checkbox');
      checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
          const empId = cb.value;
          if (cb.checked) {
            if (!bulkSelectedEmployeeIds.includes(empId)) bulkSelectedEmployeeIds.push(empId);
          } else {
            bulkSelectedEmployeeIds = bulkSelectedEmployeeIds.filter(id => id !== empId);
          }
          updateBulkActionBar();
        });
      });
    }
  };

  // Update Bulk operations drawer bar count
  const updateBulkActionBar = () => {
    const bar = document.getElementById('bulk-attendance-bar');
    const selectAllCheckbox = document.getElementById('select-all-att-checkbox');
    const label = document.getElementById('bulk-select-count');
    const totalCheckboxes = document.querySelectorAll('.att-row-checkbox').length;

    if (!bar) return;

    if (bulkSelectedEmployeeIds.length > 0) {
      bar.style.display = 'flex';
      label.textContent = `${bulkSelectedEmployeeIds.length} employee(s) selected`;
      selectAllCheckbox.checked = bulkSelectedEmployeeIds.length === totalCheckboxes;
    } else {
      bar.style.display = 'none';
      selectAllCheckbox.checked = false;
    }
  };

  // Toggle All Row Checkboxes
  const selectAllAttCheckbox = document.getElementById('select-all-att-checkbox');
  if (selectAllAttCheckbox) {
    selectAllAttCheckbox.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      const checkboxes = document.querySelectorAll('.att-row-checkbox');
      
      bulkSelectedEmployeeIds = [];
      checkboxes.forEach(cb => {
        cb.checked = isChecked;
        if (isChecked) {
          bulkSelectedEmployeeIds.push(cb.value);
        }
      });
      updateBulkActionBar();
    });
  }

  // Bulk set status application
  const btnApplyBulk = document.getElementById('btn-apply-bulk');
  const bulkStatusDropdown = document.getElementById('bulk-status-apply');
  if (btnApplyBulk && bulkStatusDropdown) {
    btnApplyBulk.addEventListener('click', () => {
      const statusVal = bulkStatusDropdown.value;
      if (!statusVal) {
        showToast('Please select an attendance status to apply.', 'warning');
        return;
      }

      // Find selected rows and set inputs
      bulkSelectedEmployeeIds.forEach(id => {
        const row = document.querySelector(`tr[data-emp-id="${id}"]`);
        if (row) {
          row.querySelector('.att-status-select').value = statusVal;
          window.handleAttStatusChange(id, statusVal);
        }
      });

      bulkSelectedEmployeeIds = [];
      updateBulkActionBar();
      showToast(`Applied ${statusVal} status to selected employees. Save sheet to commit.`, 'info');
    });
  }

  const btnCancelBulk = document.getElementById('btn-cancel-bulk');
  if (btnCancelBulk) {
    btnCancelBulk.addEventListener('click', () => {
      bulkSelectedEmployeeIds = [];
      const checkboxes = document.querySelectorAll('.att-row-checkbox');
      checkboxes.forEach(cb => cb.checked = false);
      updateBulkActionBar();
    });
  }

  // Handle dropdown state shifts disable time fields
  window.handleAttStatusChange = (empId, status) => {
    const row = document.querySelector(`tr[data-emp-id="${empId}"]`);
    if (!row) return;

    const inInput = row.querySelector('.att-checkin-input');
    const outInput = row.querySelector('.att-checkout-input');

    if (status === 'Absent' || status === 'Leave') {
      inInput.disabled = true;
      outInput.disabled = true;
    } else {
      inInput.disabled = false;
      outInput.disabled = false;
      // Preload timings if blank
      const settings = AppDB.getSettings();
      if (!inInput.value) inInput.value = settings.workHours.startTime;
      if (!outInput.value) outInput.value = settings.workHours.endTime;
    }
    window.handleAttTimingsChange(empId);
  };

  // Interactive Live checkin flags calculator
  window.handleAttTimingsChange = (empId) => {
    const row = document.querySelector(`tr[data-emp-id="${empId}"]`);
    if (!row) return;

    const status = row.querySelector('.att-status-select').value;
    const inVal = row.querySelector('.att-checkin-input').value;
    const outVal = row.querySelector('.att-checkout-input').value;
    const flagsCell = row.querySelector('.att-flags-cell');

    if (status === 'Absent' || status === 'Leave') {
      flagsCell.innerHTML = '';
      return;
    }

    const settings = AppDB.getSettings();
    const workStartMins = parseTimeMinutes(settings.workHours.startTime);
    const workEndMins = parseTimeMinutes(settings.workHours.endTime);
    const gracePeriod = settings.workHours.gracePeriod;

    let isLate = false;
    let isEarly = false;

    if (inVal && (status === 'Present' || status === 'Half Day')) {
      const inMins = parseTimeMinutes(inVal);
      isLate = inMins > (workStartMins + gracePeriod);
    }

    if (outVal && (status === 'Present' || status === 'Half Day')) {
      const outMins = parseTimeMinutes(outVal);
      isEarly = outMins < workEndMins;
    }

    let flagsHtml = '';
    if (isLate) flagsHtml += `<span class="badge badge-late">Late Entry</span> `;
    if (isEarly) flagsHtml += `<span class="badge badge-halfday">Early Exit</span>`;
    if (!isLate && !isEarly && (status === 'Present' || status === 'WFH')) {
      flagsHtml += `<span class="badge badge-present">On Time</span>`;
    }

    flagsCell.innerHTML = flagsHtml;
  };

  function parseTimeMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  // Save Attendance Button click event
  const saveAttBtn = document.getElementById('save-attendance-btn');
  if (saveAttBtn) {
    saveAttBtn.addEventListener('click', () => {
      const rows = document.querySelectorAll('#attendance-table-body tr[data-emp-id]');
      const recordsToSave = [];

      rows.forEach(row => {
        const employeeId = row.getAttribute('data-emp-id');
        const status = row.querySelector('.att-status-select').value;
        const checkIn = row.querySelector('.att-checkin-input').value;
        const checkOut = row.querySelector('.att-checkout-input').value;
        const notes = row.querySelector('.att-notes-input').value.trim();

        recordsToSave.push({
          date: attendanceDate,
          employeeId,
          status,
          checkIn,
          checkOut,
          notes
        });
      });

      AppDB.markAttendance(recordsToSave);
      showToast(`Daily attendance records saved for ${attendanceDate}`, 'success');
      renderAttendance();
    });
  }

  // -------------------------------------------------------------
  // VIEW RENDERER 4: LEAVE MANAGEMENT
  // -------------------------------------------------------------
  
  const leaveQueuePane = document.getElementById('leave-queue-pane');
  const leaveMatrixPane = document.getElementById('leave-matrix-pane');
  const leaveTabRequests = document.getElementById('leave-tab-requests');
  const leaveTabBalances = document.getElementById('leave-tab-balances');

  if (leaveTabRequests && leaveTabBalances) {
    leaveTabRequests.addEventListener('click', () => {
      leaveTabRequests.className = 'btn btn-primary';
      leaveTabBalances.className = 'btn btn-secondary';
      leaveQueuePane.style.display = 'block';
      leaveMatrixPane.style.display = 'none';
      renderLeaves();
    });

    leaveTabBalances.addEventListener('click', () => {
      leaveTabBalances.className = 'btn btn-primary';
      leaveTabRequests.className = 'btn btn-secondary';
      leaveQueuePane.style.display = 'none';
      leaveMatrixPane.style.display = 'block';
      renderLeaves();
    });
  }

  // Apply Leave trigger modal
  const applyLeaveTrigger = document.getElementById('apply-leave-trigger');
  if (applyLeaveTrigger) {
    applyLeaveTrigger.addEventListener('click', () => {
      document.getElementById('leave-form').reset();
      
      // Auto dates
      const today = new Date();
      document.getElementById('leave-start-date').value = formatDateString(today);
      document.getElementById('leave-end-date').value = formatDateString(today);

      openModal('leave-modal');
    });
  }

  const renderLeaves = () => {
    // 1. Render Requests Queue Table
    const queueTbody = document.getElementById('leaves-table-body');
    if (queueTbody) {
      const leaves = AppDB.getLeaves().sort((a,b) => b.id.localeCompare(a.id));
      if (leaves.length === 0) {
        queueTbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 40px 0;">No leave applications on file.</td></tr>`;
      } else {
        queueTbody.innerHTML = leaves.map(lv => {
          const emp = AppDB.getEmployeeById(lv.employeeId);
          const empName = emp ? emp.name : 'Unknown Staff';
          
          let badgeClass = 'badge-halfday'; // Pending
          if (lv.status === 'Approved') badgeClass = 'badge-present';
          if (lv.status === 'Rejected') badgeClass = 'badge-absent';

          const actionsHtml = lv.status === 'Pending' ? `
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-primary" style="padding: 4px 10px; font-size: 0.75rem; width: auto;" onclick="window.approveLeave('${lv.id}')"><i class="fa-solid fa-check"></i> Approve</button>
              <button class="btn btn-danger" style="padding: 4px 10px; font-size: 0.75rem; width: auto;" onclick="window.rejectLeave('${lv.id}')"><i class="fa-solid fa-xmark"></i> Reject</button>
            </div>
          ` : `<span style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">No actions</span>`;

          return `
            <tr>
              <td><strong class="id-tag">${lv.id}</strong></td>
              <td>
                <div class="user-cell">
                  <img src="${emp?.photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256'}" alt="">
                  <div>
                    <div class="name">${empName}</div>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">${lv.employeeId}</span>
                  </div>
                </div>
              </td>
              <td><span class="badge badge-leave">${lv.leaveType}</span></td>
              <td>
                <div style="font-size: 0.85rem;">
                  <div>${lv.startDate} to ${lv.endDate}</div>
                  <small style="color: var(--text-muted);"><i class="fa-solid fa-clock"></i> ${calculateDaysRange(lv.startDate, lv.endDate)} day(s)</small>
                </div>
              </td>
              <td><div style="max-width: 200px; font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${lv.reason}">${lv.reason}</div></td>
              <td><span style="font-size: 0.8rem; color: var(--text-muted);">${lv.appliedDate}</span></td>
              <td><span class="badge ${badgeClass}">${lv.status}</span></td>
              <td>${actionsHtml}</td>
            </tr>
          `;
        }).join('');
      }
    }

    // 2. Render Balances pane elements
    renderLeaveBalancesForSelected();
  };

  const calculateDaysRange = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.abs(e - s);
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  window.approveLeave = (id) => {
    AppDB.updateLeaveStatus(id, 'Approved');
    showToast(`Leave request ${id} has been Approved.`, 'success');
    renderLeaves();
  };

  window.rejectLeave = (id) => {
    AppDB.updateLeaveStatus(id, 'Rejected');
    showToast(`Leave request ${id} has been Rejected.`, 'danger');
    renderLeaves();
  };

  const leaveBalanceSelect = document.getElementById('leave-balance-emp-select');
  if (leaveBalanceSelect) {
    leaveBalanceSelect.addEventListener('change', () => {
      renderLeaveBalancesForSelected();
    });
  }

  const renderLeaveBalancesForSelected = () => {
    const empId = leaveBalanceSelect ? leaveBalanceSelect.value : '';
    const matrixGrid = document.getElementById('leave-balance-matrix-grid');
    const historyTable = document.getElementById('leave-emp-history-body');

    if (!empId) {
      if (matrixGrid) matrixGrid.innerHTML = ``;
      if (historyTable) historyTable.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Select an employee to check records history.</td></tr>`;
      return;
    }

    // Load balances matrix cards
    const balances = AppDB.calculateLeaveBalances(empId);
    
    if (matrixGrid) {
      matrixGrid.innerHTML = Object.keys(balances).map(type => {
        const bal = balances[type];
        const available = bal.allocated - bal.taken;
        
        let cardBg = 'rgba(16, 185, 129, 0.08)';
        let textColor = 'var(--color-present)';
        if (type === 'Sick') { cardBg = 'rgba(239, 68, 68, 0.08)'; textColor = 'var(--color-absent)'; }
        if (type === 'Paid') { cardBg = 'rgba(139, 92, 246, 0.08)'; textColor = 'var(--color-leave)'; }
        if (type === 'Unpaid') { cardBg = 'rgba(245, 158, 11, 0.08)'; textColor = 'var(--color-halfday)'; }

        return `
          <div class="leave-matrix-card glass" style="background-color: ${cardBg}; border-color: ${textColor}">
            <div class="title" style="color: ${textColor};">${type} Leaves</div>
            <div class="leave-matrix-numbers">
              <span class="avail" style="color: ${textColor};">${available}</span>
              <span class="total">/ ${bal.allocated} Left</span>
            </div>
            <span style="font-size: 0.75rem; color: var(--text-secondary);">Used: ${bal.taken} | Pending: ${bal.pending}</span>
          </div>
        `;
      }).join('');
    }

    // Load history table filter by selected staff
    if (historyTable) {
      const list = AppDB.getLeaves().filter(lv => lv.employeeId === empId).sort((a,b) => b.startDate.localeCompare(a.startDate));
      if (list.length === 0) {
        historyTable.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px 0;">No leave logs recorded for this employee.</td></tr>`;
      } else {
        historyTable.innerHTML = list.map(lv => {
          let badgeClass = 'badge-halfday';
          if (lv.status === 'Approved') badgeClass = 'badge-present';
          if (lv.status === 'Rejected') badgeClass = 'badge-absent';

          return `
            <tr>
              <td><span class="badge badge-leave">${lv.leaveType}</span></td>
              <td>${lv.startDate} to ${lv.endDate}</td>
              <td>${calculateDaysRange(lv.startDate, lv.endDate)} Day(s)</td>
              <td><small>${lv.reason}</small></td>
              <td><span class="badge ${badgeClass}">${lv.status}</span></td>
            </tr>
          `;
        }).join('');
      }
    }
  };

  // Leave Form Submission
  const leaveForm = document.getElementById('leave-form');
  if (leaveForm) {
    leaveForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const start = document.getElementById('leave-start-date').value;
      const end = document.getElementById('leave-end-date').value;
      
      if (end < start) {
        showToast('End Date cannot be earlier than Start Date.', 'warning');
        return;
      }

      const data = {
        employeeId: document.getElementById('leave-emp-select').value,
        leaveType: document.getElementById('leave-type').value,
        startDate: start,
        endDate: end,
        reason: document.getElementById('leave-reason').value.trim()
      };

      // Check balance before applying (optional, but professional)
      const bal = AppDB.calculateLeaveBalances(data.employeeId)[data.leaveType];
      const reqDays = calculateDaysRange(data.startDate, data.endDate);
      const available = bal.allocated - bal.taken;

      if (reqDays > available && data.leaveType !== 'Unpaid') {
        showConfirm(
          'Insufficient Balance', 
          `Employee only has ${available} days left for ${data.leaveType} leave, but requested ${reqDays} day(s). Proceed to apply anyway?`,
          () => submitLeave(data)
        );
      } else {
        submitLeave(data);
      }
    });
  }

  const submitLeave = (data) => {
    AppDB.applyLeave(data);
    showToast('Leave request submitted and queued for review.', 'success');
    closeModal('leave-modal');
    renderLeaves();
  };

  // -------------------------------------------------------------
  // VIEW RENDERER 5: REPORTS & EXPORTS
  // -------------------------------------------------------------
  
  const reportTypeSelect = document.getElementById('report-type-select');
  const reportEmpWrapper = document.getElementById('report-emp-wrapper');
  const reportDeptWrapper = document.getElementById('report-dept-wrapper');
  const reportStartDateWrapper = document.getElementById('report-start-date-wrapper');
  const reportEndDateWrapper = document.getElementById('report-end-date-wrapper');

  if (reportTypeSelect) {
    // Conditional layout filters show
    reportTypeSelect.addEventListener('change', () => {
      const type = reportTypeSelect.value;
      reportType = type;

      reportEmpWrapper.style.display = type === 'employee' ? 'block' : 'none';
      reportDeptWrapper.style.display = type === 'department' ? 'block' : 'none';
      reportEndDateWrapper.style.display = type === 'daily' ? 'none' : 'block';
      
      const label = reportStartDateWrapper.querySelector('label');
      if (type === 'daily') {
        label.textContent = 'Date';
      } else {
        label.textContent = 'Start Date';
      }
    });
  }

  // Pre-load default values on reports view
  const rStartInput = document.getElementById('report-start-date');
  const rEndInput = document.getElementById('report-end-date');
  if (rStartInput) rStartInput.value = reportStartDate;
  if (rEndInput) rEndInput.value = reportEndDate;

  // Query Submit Form click event
  const reportForm = document.getElementById('report-query-form');
  if (reportForm) {
    reportForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      reportStartDate = rStartInput.value;
      reportEndDate = rEndInput.value;
      reportEmployeeId = document.getElementById('report-employee-select').value;
      reportDept = document.getElementById('report-department-select').value;

      runReportQuery();
    });
  }

  const runReportQuery = () => {
    const history = AppDB.getAttendanceHistory();
    const employees = AppDB.getEmployees();
    let resultsTitle = '';
    let resultsMeta = '';
    let tableHtml = '';

    // Initialize toggle states exports
    activeReportData = null;
    toggleExportButtons(false);

    if (reportType === 'daily') {
      resultsTitle = `Daily Attendance Summary: ${reportStartDate}`;
      
      const filteredLogs = history.filter(h => h.date === reportStartDate);
      const activeEmps = employees.filter(e => e.status === 'Active');
      
      resultsMeta = `Total Active: ${activeEmps.length} | Logs Registered: ${filteredLogs.length}`;

      tableHtml = `
        <thead>
          <tr>
            <th>Employee ID</th>
            <th>Name</th>
            <th>Department</th>
            <th>Designation</th>
            <th>Status</th>
            <th>Check In</th>
            <th>Check Out</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
      `;

      if (activeEmps.length === 0) {
        tableHtml += `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No active employees configured.</td></tr>`;
      } else {
        tableHtml += activeEmps.map(emp => {
          const log = filteredLogs.find(l => l.employeeId === emp.id);
          const status = log ? log.status : '<span style="color: var(--text-muted); font-style: italic;">Unmarked</span>';
          const inVal = log ? (log.checkIn || '-') : '-';
          const outVal = log ? (log.checkOut || '-') : '-';
          const notes = log ? (log.notes || '-') : '-';
          
          let badgeClass = 'badge-absent';
          if (log) {
            if (log.status === 'Present') badgeClass = 'badge-present';
            if (log.status === 'Half Day') badgeClass = 'badge-halfday';
            if (log.status === 'Leave') badgeClass = 'badge-leave';
            if (log.status === 'WFH') badgeClass = 'badge-wfh';
          }

          const statusHtml = log ? `<span class="badge ${badgeClass}">${status}</span>` : `<span class="badge badge-absent" style="background-color: var(--border-soft); color: var(--text-muted);">Unmarked</span>`;

          return `
            <tr>
              <td><strong class="id-tag">${emp.id}</strong></td>
              <td>${emp.name}</td>
              <td>${emp.department}</td>
              <td>${emp.designation}</td>
              <td>${statusHtml}</td>
              <td>${inVal}</td>
              <td>${outVal}</td>
              <td><small>${notes}</small></td>
            </tr>
          `;
        }).join('');
      }

      tableHtml += `</tbody>`;
      activeReportData = { type: 'daily', date: reportStartDate };
      toggleExportButtons(activeEmps.length > 0);

    } else if (reportType === 'range') {
      if (!reportEndDate) {
        showToast('Please select an end date for range reports.', 'warning');
        return;
      }
      if (reportEndDate < reportStartDate) {
        showToast('End date cannot be earlier than start date.', 'warning');
        return;
      }

      resultsTitle = `Date Range Ledger: ${reportStartDate} to ${reportEndDate}`;

      // Filter history within dates
      const rangeLogs = history.filter(h => h.date >= reportStartDate && h.date <= reportEndDate);
      resultsMeta = `Total Logs found: ${rangeLogs.length}`;

      tableHtml = `
        <thead>
          <tr>
            <th>Date</th>
            <th>Employee ID</th>
            <th>Employee Name</th>
            <th>Department</th>
            <th>Status</th>
            <th>Check In</th>
            <th>Check Out</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
      `;

      if (rangeLogs.length === 0) {
        tableHtml += `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No logs registered within the selected dates.</td></tr>`;
      } else {
        // Sort range logs by date descending
        rangeLogs.sort((a,b) => b.date.localeCompare(a.date));
        tableHtml += rangeLogs.map(log => {
          const emp = employees.find(e => e.id === log.employeeId);
          const empName = emp ? emp.name : 'Deleted Employee';
          const empDept = emp ? emp.department : '-';

          let badgeClass = 'badge-absent';
          if (log.status === 'Present') badgeClass = 'badge-present';
          if (log.status === 'Half Day') badgeClass = 'badge-halfday';
          if (log.status === 'Leave') badgeClass = 'badge-leave';
          if (log.status === 'WFH') badgeClass = 'badge-wfh';

          return `
            <tr>
              <td>${log.date}</td>
              <td><strong class="id-tag">${log.employeeId}</strong></td>
              <td>${empName}</td>
              <td>${empDept}</td>
              <td><span class="badge ${badgeClass}">${log.status}</span></td>
              <td>${log.checkIn || '-'}</td>
              <td>${log.checkOut || '-'}</td>
              <td><small>${log.notes || '-'}</small></td>
            </tr>
          `;
        }).join('');
      }

      tableHtml += `</tbody>`;
      activeReportData = { type: 'range', start: reportStartDate, end: reportEndDate };
      toggleExportButtons(rangeLogs.length > 0);

    } else if (reportType === 'employee') {
      if (!reportEmployeeId) {
        showToast('Please select an employee.', 'warning');
        return;
      }
      if (!reportEndDate) {
        showToast('Please select an end date.', 'warning');
        return;
      }

      const emp = AppDB.getEmployeeById(reportEmployeeId);
      resultsTitle = `Employee Attendance: ${emp ? emp.name : 'Unknown Staff'} (${reportEmployeeId})`;

      const empLogs = history.filter(h => h.employeeId === reportEmployeeId && h.date >= reportStartDate && h.date <= reportEndDate);
      
      // Compute statistics sums
      let present = 0, absent = 0, half = 0, leave = 0, wfh = 0, late = 0;
      empLogs.forEach(l => {
        if (l.status === 'Present') present++;
        if (l.status === 'Absent') absent++;
        if (l.status === 'Half Day') half++;
        if (l.status === 'Leave') leave++;
        if (l.status === 'WFH') wfh++;
        if (l.isLate) late++;
      });

      resultsMeta = `Present: ${present} | Absent: ${absent} | WFH: ${wfh} | Leave: ${leave} | HalfDay: ${half} | Late: ${late}`;

      tableHtml = `
        <thead>
          <tr>
            <th>Date</th>
            <th>Status</th>
            <th>Check In</th>
            <th>Check Out</th>
            <th>Late Entry</th>
            <th>Early Exit</th>
            <th>Notes / Remarks</th>
          </tr>
        </thead>
        <tbody>
      `;

      if (empLogs.length === 0) {
        tableHtml += `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No attendance entries on record for this range.</td></tr>`;
      } else {
        empLogs.sort((a,b) => b.date.localeCompare(a.date));
        tableHtml += empLogs.map(log => {
          let badgeClass = 'badge-absent';
          if (log.status === 'Present') badgeClass = 'badge-present';
          if (log.status === 'Half Day') badgeClass = 'badge-halfday';
          if (log.status === 'Leave') badgeClass = 'badge-leave';
          if (log.status === 'WFH') badgeClass = 'badge-wfh';

          return `
            <tr>
              <td>${log.date}</td>
              <td><span class="badge ${badgeClass}">${log.status}</span></td>
              <td>${log.checkIn || '-'}</td>
              <td>${log.checkOut || '-'}</td>
              <td>${log.isLate ? '<span style="color: var(--danger);"><i class="fa-solid fa-circle-exclamation"></i> Late</span>' : 'No'}</td>
              <td>${log.isEarlyExit ? '<span style="color: var(--color-halfday);"><i class="fa-solid fa-circle-exclamation"></i> Early</span>' : 'No'}</td>
              <td><small>${log.notes || '-'}</small></td>
            </tr>
          `;
        }).join('');
      }

      tableHtml += `</tbody>`;
      activeReportData = { type: 'employee', employee: emp?.name || reportEmployeeId, start: reportStartDate, end: reportEndDate };
      toggleExportButtons(empLogs.length > 0);

    } else if (reportType === 'department') {
      if (!reportDept) {
        showToast('Please select a department.', 'warning');
        return;
      }
      if (!reportEndDate) {
        showToast('Please select an end date.', 'warning');
        return;
      }

      resultsTitle = `Departmental Summary: ${reportDept}`;
      
      const deptEmps = employees.filter(e => e.department === reportDept && e.status === 'Active');
      const deptEmpIds = deptEmps.map(e => e.id);
      
      const deptLogs = history.filter(h => deptEmpIds.includes(h.employeeId) && h.date >= reportStartDate && h.date <= reportEndDate);

      resultsMeta = `Total Staff: ${deptEmps.length} | Log Records: ${deptLogs.length}`;

      tableHtml = `
        <thead>
          <tr>
            <th>Date</th>
            <th>Staff Count</th>
            <th>Present</th>
            <th>WFH</th>
            <th>Leave</th>
            <th>Half Day</th>
            <th>Absent</th>
            <th>Att. Rate</th>
          </tr>
        </thead>
        <tbody>
      `;

      if (deptLogs.length === 0) {
        tableHtml += `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No entries on file for this department range.</td></tr>`;
      } else {
        // Group logs by date
        const dateGroups = {};
        deptLogs.forEach(log => {
          if (!dateGroups[log.date]) {
            dateGroups[log.date] = { present: 0, absent: 0, half: 0, leave: 0, wfh: 0 };
          }
          const group = dateGroups[log.date];
          if (log.status === 'Present') group.present++;
          if (log.status === 'Absent') group.absent++;
          if (log.status === 'Half Day') group.half++;
          if (log.status === 'Leave') group.leave++;
          if (log.status === 'WFH') group.wfh++;
        });

        const sortedDates = Object.keys(dateGroups).sort((a,b) => b.localeCompare(a));
        tableHtml += sortedDates.map(date => {
          const g = dateGroups[date];
          const onDuty = g.present + g.wfh + g.half;
          const rate = deptEmps.length > 0 ? Math.round((onDuty / deptEmps.length) * 100) : 0;
          
          return `
            <tr>
              <td>${date}</td>
              <td>${deptEmps.length}</td>
              <td>${g.present}</td>
              <td>${g.wfh}</td>
              <td>${g.leave}</td>
              <td>${g.half}</td>
              <td>${g.absent}</td>
              <td><strong>${rate}%</strong></td>
            </tr>
          `;
        }).join('');
      }

      tableHtml += `</tbody>`;
      activeReportData = { type: 'department', department: reportDept, start: reportStartDate, end: reportEndDate };
      toggleExportButtons(deptLogs.length > 0);
    }

    document.getElementById('report-results-title').textContent = resultsTitle;
    document.getElementById('report-results-metadata').textContent = resultsMeta;
    
    const outputTable = document.getElementById('reports-output-table');
    if (outputTable) {
      outputTable.innerHTML = tableHtml;
    }
  };

  const toggleExportButtons = (enable) => {
    document.getElementById('export-excel-btn').disabled = !enable;
    document.getElementById('export-pdf-btn').disabled = !enable;
    document.getElementById('print-report-btn').disabled = !enable;
  };

  // --- EXPORT 1: EXCEL SHEETJS ---
  const exportExcelBtn = document.getElementById('export-excel-btn');
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', () => {
      if (!activeReportData) return;

      try {
        const table = document.getElementById('reports-output-table');
        const wb = XLSX.utils.table_to_book(table, { sheet: "Attendance Summary" });
        
        let filename = `Report_${activeReportData.type}`;
        if (activeReportData.date) filename += `_${activeReportData.date}`;
        if (activeReportData.start) filename += `_${activeReportData.start}_to_${activeReportData.end}`;
        
        XLSX.writeFile(wb, `${filename}.xlsx`);
        showToast('Excel spreadsheet exported successfully.', 'success');
      } catch (err) {
        console.error(err);
        showToast('Export to Excel failed.', 'danger');
      }
    });
  }

  // --- EXPORT 2: PDF export using jsPDF-AutoTable ---
  const exportPdfBtn = document.getElementById('export-pdf-btn');
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
      if (!activeReportData) return;

      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Document styling headers
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(18);
        doc.text(AppDB.getSettings().companyName, 14, 20);
        
        doc.setFontSize(12);
        doc.setFont("Helvetica", "normal");
        let subtitle = `Attendance Report: ${activeReportData.type.toUpperCase()}`;
        if (activeReportData.employee) subtitle += ` - Staff: ${activeReportData.employee}`;
        if (activeReportData.department) subtitle += ` - Dept: ${activeReportData.department}`;
        doc.text(subtitle, 14, 28);
        
        let datesLine = '';
        if (activeReportData.date) datesLine = `Report Date: ${activeReportData.date}`;
        if (activeReportData.start) datesLine = `Range Period: ${activeReportData.start} to ${activeReportData.end}`;
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(datesLine, 14, 34);

        // Generate Table PDF Layout
        doc.autoTable({
          html: '#reports-output-table',
          startY: 40,
          styles: { fontSize: 8, font: "Helvetica" },
          headStyles: { fillColor: [59, 130, 246] }, // Primary Accent Blue
          theme: 'striped'
        });

        let filename = `Report_${activeReportData.type}`;
        if (activeReportData.date) filename += `_${activeReportData.date}`;
        if (activeReportData.start) filename += `_${activeReportData.start}_to_${activeReportData.end}`;

        doc.save(`${filename}.pdf`);
        showToast('PDF file downloaded successfully.', 'success');
      } catch (err) {
        console.error(err);
        showToast('Export to PDF failed.', 'danger');
      }
    });
  }

  // --- EXPORT 3: Print browser window ---
  const printReportBtn = document.getElementById('print-report-btn');
  if (printReportBtn) {
    printReportBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // -------------------------------------------------------------
  // VIEW RENDERER 6: SYSTEM SETTINGS
  // -------------------------------------------------------------
  
  const renderSettings = () => {
    const settings = AppDB.getSettings();

    // Set form fields values
    document.getElementById('settings-company-name').value = settings.companyName;
    document.getElementById('settings-shift-start').value = settings.workHours.startTime;
    document.getElementById('settings-shift-end').value = settings.workHours.endTime;
    document.getElementById('settings-grace-period').value = settings.workHours.gracePeriod;
    document.getElementById('settings-admin-username').value = settings.adminCredentials.username;
    document.getElementById('settings-admin-password').value = ''; // Blank input for typing new password

    if (settings.companyLogo) {
      document.getElementById('company-logo-preview').src = settings.companyLogo;
    } else {
      document.getElementById('company-logo-preview').src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256';
    }

    // Weekend toggles
    const weekendCbs = document.querySelectorAll('input[name="settings-weekend"]');
    weekendCbs.forEach(cb => {
      const val = parseInt(cb.value, 10);
      cb.checked = settings.weekends.includes(val);
    });

    renderSettingsDeptHierarchy();
  };

  const renderSettingsDeptHierarchy = () => {
    const displayEl = document.getElementById('dept-list-display');
    const selectEl = document.getElementById('add-desig-dept-select');
    if (!displayEl) return;

    const depts = AppDB.getDepartments();
    
    // Populate modal drop selects for designation adding
    if (selectEl) {
      selectEl.innerHTML = depts.map(d => `<option value="${d}">${d}</option>`).join('');
    }

    if (depts.length === 0) {
      displayEl.innerHTML = `<span style="font-size: 0.8rem; color: var(--text-muted);">No departments.</span>`;
      return;
    }

    displayEl.innerHTML = depts.map(d => {
      const designs = AppDB.getDesignations(d);
      const desigListHtml = designs.length > 0 
        ? designs.map(des => `<li style="font-size: 0.75rem; margin-left: 14px; list-style-type: circle;">${des}</li>`).join('')
        : `<li style="font-size: 0.75rem; margin-left: 14px; list-style-type: none; color: var(--text-muted);">No designations.</li>`;

      return `
        <div style="margin-bottom: 10px;">
          <strong style="font-size: 0.85rem; color: var(--accent);"><i class="fa-solid fa-network-wired"></i> ${d}</strong>
          <ul style="margin-top: 4px;">
            ${desigListHtml}
          </ul>
        </div>
      `;
    }).join('');
  };

  // Manage departments triggers dialog modal
  const manageDeptsBtn = document.getElementById('manage-departments-btn');
  if (manageDeptsBtn) {
    manageDeptsBtn.addEventListener('click', () => {
      renderSettingsDeptHierarchy();
      openModal('dept-modal');
    });
  }

  // Create Department Submission
  const btnAddDept = document.getElementById('btn-add-dept');
  const inputNewDept = document.getElementById('new-dept-input');
  if (btnAddDept && inputNewDept) {
    btnAddDept.addEventListener('click', () => {
      const name = inputNewDept.value.trim();
      if (!name) {
        showToast('Please enter a department name.', 'warning');
        return;
      }

      if (AppDB.addDepartment(name)) {
        inputNewDept.value = '';
        renderSettingsDeptHierarchy();
        populateDepartmentDropdowns();
        showToast(`Created department: ${name}`, 'success');
      } else {
        showToast('Department name already exists or invalid.', 'warning');
      }
    });
  }

  // Create Designation Submission
  const btnAddDesig = document.getElementById('btn-add-desig');
  const selectDesigDept = document.getElementById('add-desig-dept-select');
  const inputNewDesig = document.getElementById('new-desig-input');
  if (btnAddDesig && selectDesigDept && inputNewDesig) {
    btnAddDesig.addEventListener('click', () => {
      const dept = selectDesigDept.value;
      const desig = inputNewDesig.value.trim();

      if (!dept) {
        showToast('Please select a department.', 'warning');
        return;
      }
      if (!desig) {
        showToast('Please enter a designation name.', 'warning');
        return;
      }

      if (AppDB.addDesignation(dept, desig)) {
        inputNewDesig.value = '';
        renderSettingsDeptHierarchy();
        showToast(`Added designation: ${desig}`, 'success');
      } else {
        showToast('Designation already exists in this department.', 'warning');
      }
    });
  }

  // Save Settings Submit Button event click
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      const companyName = document.getElementById('settings-company-name').value.trim();
      const startTime = document.getElementById('settings-shift-start').value;
      const endTime = document.getElementById('settings-shift-end').value;
      const gracePeriod = parseInt(document.getElementById('settings-grace-period').value, 10) || 0;
      
      const adminUsername = document.getElementById('settings-admin-username').value.trim();
      const newPassword = document.getElementById('settings-admin-password').value.trim();

      if (!companyName) {
        showToast('Company display name is required.', 'warning');
        return;
      }

      // Collect weekends checkboxes
      const weekendCbs = document.querySelectorAll('input[name="settings-weekend"]:checked');
      const weekends = Array.from(weekendCbs).map(cb => parseInt(cb.value, 10));

      const updatedSettings = {
        companyName,
        companyLogo: document.getElementById('company-logo-preview').src,
        workHours: {
          startTime,
          endTime,
          gracePeriod
        },
        weekends,
        adminCredentials: {
          username: adminUsername
        }
      };

      // Handle password update only if provided
      if (newPassword) {
        updatedSettings.adminCredentials.password = newPassword;
      } else {
        // Fallback to original
        updatedSettings.adminCredentials.password = AppDB.getSettings().adminCredentials.password;
      }

      AppDB.saveSettings(updatedSettings);
      showToast('System portal preferences saved.', 'success');
      
      // Reload branding text immediately
      loadCompanySettings();
      renderSettings();
    });
  }

  // Export JSON Backup file trigger
  const btnExportBackup = document.getElementById('btn-export-backup');
  if (btnExportBackup) {
    btnExportBackup.addEventListener('click', () => {
      try {
        const raw = AppDB.getRawData();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(raw, null, 2));
        
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute("href", dataStr);
        dlAnchor.setAttribute("download", `database_backup_${formatDateString(new Date())}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
        
        showToast('JSON database backup file generated successfully.', 'success');
      } catch (err) {
        console.error(err);
        showToast('Failed to export backup.', 'danger');
      }
    });
  }

  // Restore database backup file input load
  const restoreFileInput = document.getElementById('settings-restore-file');
  if (restoreFileInput) {
    restoreFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsedData = JSON.parse(event.target.result);
          showConfirm(
            'Over-write database?',
            'Warning: Restoring this file will wipe all active local storage records data. Proceed?',
            () => {
              const success = AppDB.restoreData(parsedData);
              if (success) {
                showToast('Database restored! Reloading system...', 'success');
                setTimeout(() => window.location.reload(), 1500);
              } else {
                showToast('Failed to restore data. Check JSON validity.', 'danger');
              }
            }
          );
        } catch (err) {
          showToast('Failed to parse file. Ensure it is a valid backup JSON file.', 'danger');
        }
      };
      reader.readAsText(file);
      restoreFileInput.value = ''; // Reset
    });
  }

  // Reset database completely
  const btnResetDb = document.getElementById('btn-reset-db');
  if (btnResetDb) {
    btnResetDb.addEventListener('click', () => {
      showConfirm(
        'FACTORY RESET SYSTEM?',
        'Warning: This action deletes all logs, custom settings, added employees, and leave request tables, replacing them with defaults. Are you absolutely sure?',
        () => {
          AppDB.resetDatabase();
          showToast('Database wiped to factory defaults. Reloading...', 'success');
          setTimeout(() => window.location.reload(), 1500);
        }
      );
    });
  }

  // -------------------------------------------------------------
  // DROPDOWN POPULATOR HELPERS
  // -------------------------------------------------------------
  
  function populateDepartmentDropdowns() {
    const depts = AppDB.getDepartments();
    const filters = ['filter-emp-dept', 'employee-dept', 'report-department-select'];
    
    filters.forEach(id => {
      const select = document.getElementById(id);
      if (!select) return;

      // Keep first option (placeholder option like "All departments" or "Select Department...")
      const firstOpt = select.options[0];
      select.innerHTML = '';
      select.appendChild(firstOpt);

      depts.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        select.appendChild(opt);
      });
    });
  }

  function populateEmployeeDropdowns() {
    const employees = AppDB.getEmployees().filter(emp => emp.status === 'Active');
    const lists = ['leave-balance-emp-select', 'leave-emp-select', 'report-employee-select', 'att-calendar-emp-select'];

    lists.forEach(id => {
      const select = document.getElementById(id);
      if (!select) return;

      const firstOpt = select.options[0];
      select.innerHTML = '';
      if (firstOpt) select.appendChild(firstOpt);

      employees.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.id;
        opt.textContent = `${emp.name} (${emp.id})`;
        select.appendChild(opt);
      });
    });
  }

  // Initial Boot-up Execution
  initApp();
});
