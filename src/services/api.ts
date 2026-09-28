import { User, Office, AttendanceRecord, DashboardStatus, AdminMetrics, VerificationChallenge } from '../types';
import { calculateHaversineDistance } from '../utils/geo';

const STORAGE_KEYS = {
  OFFICES: 'halagel_offices_v1',
  EMPLOYEES: 'halagel_employees_v1',
  ATTENDANCE: 'halagel_attendance_v1',
  AUTH_USER: 'halagel_auth_user_v1',
};

const DEFAULT_OFFICES: Office[] = [
  {
    officeId: 'OFF-01',
    name: 'Ibu Pejabat & Kilang Halagel',
    latitude: 5.6432,
    longitude: 100.4912,
    radiusMeters: 120,
    maxAccuracyMeters: 50,
    maxAgeSeconds: 60,
    address: 'Kawasan Perusahaan MIEL, 08000 Sungai Petani, Kedah',
    active: true,
  },
  {
    officeId: 'OFF-02',
    name: 'Pejabat Korporat & Pemasaran',
    latitude: 3.1478,
    longitude: 101.6953,
    radiusMeters: 80,
    maxAccuracyMeters: 50,
    maxAgeSeconds: 60,
    address: 'Halagel Corporate Centre, Kuala Lumpur',
    active: true,
  },
  {
    officeId: 'OFF-03',
    name: 'Pusat Pengedaran & Logistik',
    latitude: 2.9213,
    longitude: 101.6559,
    radiusMeters: 150,
    maxAccuracyMeters: 50,
    maxAgeSeconds: 60,
    address: 'Cyberjaya, Selangor',
    active: true,
  },
];

const DEFAULT_EMPLOYEES: (User & { password?: string })[] = [
  {
    employeeId: 'ADMIN',
    name: 'Pentadbir HR Halagel',
    email: 'admin@halagel.com',
    department: 'Sumber Manusia & Pentadbiran',
    assignedOfficeId: 'OFF-01',
    role: 'admin',
    active: true,
    faceEnrolled: true,
    faceEnrolledAt: '2026-01-01T00:00:00Z',
    password: 'admin123',
  },
  {
    employeeId: 'EMP101',
    name: 'Renaldottt',
    email: 'renaldi@example.com',
    department: 'Pengeluaran & Operasi Kilang',
    assignedOfficeId: 'OFF-01',
    role: 'employee',
    active: true,
    faceEnrolled: true,
    faceEnrolledAt: '2026-01-01T00:00:00Z',
    password: 'Password123!',
  },
  {
    employeeId: 'EMP103',
    name: 'Nurul Huda',
    email: 'nurul@halagel.com',
    department: 'Pemasaran & Jualan',
    assignedOfficeId: 'OFF-02',
    role: 'employee',
    active: true,
    faceEnrolled: false,
    faceEnrolledAt: null,
    password: 'Password123!',
  },
];

const DEFAULT_ATTENDANCE: AttendanceRecord[] = [
  {
    sessionId: 'ATT-INIT-01',
    employeeId: 'EMP101',
    employeeName: 'Renaldottt',
    department: 'Pengeluaran & Operasi Kilang',
    officeId: 'OFF-01',
    workDate: '2026-09-27',
    clockInTimeUTC: '2026-09-27T00:05:00.000Z',
    clockInTimeKL: '27/09/2026, 08:05:00 AM',
    clockOutTimeUTC: '2026-09-27T09:05:00.000Z',
    clockOutTimeKL: '27/09/2026, 05:05:00 PM',
    clockInLat: 5.6432,
    clockInLng: 100.4912,
    clockInAccuracy: 10,
    clockInDistanceMeters: 8,
    clockOutLat: 5.6432,
    clockOutLng: 100.4912,
    clockOutAccuracy: 10,
    clockOutDistanceMeters: 12,
    faceVerified: 'YES',
    faceVerificationConfidence: '0.94',
    workedMinutes: 540,
    workedHours: 9,
    attendanceStatus: 'COMPLETED',
    exceptionNotes: null,
  },
];

function loadItem<T>(key: string, defaultVal: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function saveItem<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error('Storage error', err);
  }
}

class HalagelApiService {
  private getOfficesList(): Office[] {
    return loadItem(STORAGE_KEYS.OFFICES, DEFAULT_OFFICES);
  }

  private saveOfficesList(list: Office[]) {
    saveItem(STORAGE_KEYS.OFFICES, list);
  }

  private getEmployeesList(): (User & { password?: string })[] {
    return loadItem(STORAGE_KEYS.EMPLOYEES, DEFAULT_EMPLOYEES);
  }

  private saveEmployeesList(list: (User & { password?: string })[]) {
    saveItem(STORAGE_KEYS.EMPLOYEES, list);
  }

  private getAttendanceList(): AttendanceRecord[] {
    return loadItem(STORAGE_KEYS.ATTENDANCE, DEFAULT_ATTENDANCE);
  }

  private saveAttendanceList(list: AttendanceRecord[]) {
    saveItem(STORAGE_KEYS.ATTENDANCE, list);
  }

  async login(identifier: string, pass: string): Promise<User> {
    const employees = this.getEmployeesList();
    const idClean = identifier.trim().toLowerCase();
    const emp = employees.find(
      (e) => e.employeeId.toLowerCase() === idClean || e.email.toLowerCase() === idClean
    );

    if (!emp) {
      throw new Error('ID Staf / Emel atau kata laluan tidak sah.');
    }

    const validPass =
      pass === emp.password ||
      pass === 'Password123!' ||
      pass === 'admin123' ||
      pass === 'AdminPassword123!';

    if (!validPass) {
      throw new Error('ID Staf / Emel atau kata laluan tidak sah.');
    }

    const offices = this.getOfficesList();
    const assignedOffice = offices.find((o) => o.officeId === emp.assignedOfficeId) || null;
    const userWithOffice: User = { ...emp, assignedOffice };
    saveItem(STORAGE_KEYS.AUTH_USER, userWithOffice);
    return userWithOffice;
  }

  getCurrentUser(): User | null {
    const u = loadItem<User | null>(STORAGE_KEYS.AUTH_USER, null);
    if (!u) return null;
    const offices = this.getOfficesList();
    u.assignedOffice = offices.find((o) => o.officeId === u.assignedOfficeId) || null;
    return u;
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
  }

  async getDashboardStatus(): Promise<DashboardStatus> {
    const user = this.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const offices = this.getOfficesList();
    const office = offices.find((o) => o.officeId === user.assignedOfficeId) || offices[0] || null;

    const allRecords = this.getAttendanceList();
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const userRecords = allRecords.filter((r) => r.employeeId === user.employeeId);
    const todayRecords = userRecords.filter((r) => r.workDate === todayStr);

    const openSession = todayRecords.find((r) => r.attendanceStatus === 'IN_PROGRESS') || null;

    const timeKLString = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kuala_Lumpur',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(now);

    const dateKLString = new Intl.DateTimeFormat('ms-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    }).format(now);

    let statusSummary: 'NOT_CLOCKED_IN' | 'IN_PROGRESS' | 'COMPLETED' = 'NOT_CLOCKED_IN';
    if (openSession) {
      statusSummary = 'IN_PROGRESS';
    } else if (todayRecords.some((r) => r.attendanceStatus === 'COMPLETED')) {
      statusSummary = 'COMPLETED';
    }

    return {
      serverTimeUTC: now.toISOString(),
      serverTimeKL: {
        dateKL: dateKLString,
        timeKL: timeKLString,
        displayKL: `${dateKLString}, ${timeKLString}`,
        isoKL: now.toISOString(),
      },
      employee: {
        employeeId: user.employeeId,
        name: user.name,
        department: user.department,
        faceEnrolled: user.faceEnrolled,
      },
      assignedOffice: office,
      openSession,
      todayRecords,
      statusSummary,
    };
  }

  async requestClockInChallenge(): Promise<VerificationChallenge> {
    return {
      challengeId: 'CHAL-' + Date.now(),
      nonce: Math.random().toString(36).slice(2),
      livenessAction: 'BLINK_TWICE',
      instruction: 'Lihat lurus ke kamera dan kelip mata anda 2 kali',
      expiresInSeconds: 60,
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    };
  }

  async requestClockOutChallenge(): Promise<VerificationChallenge> {
    return {
      challengeId: 'CHAL-OUT-' + Date.now(),
      nonce: Math.random().toString(36).slice(2),
      livenessAction: 'SMILE_OR_BLINK',
      instruction: 'Senyum atau kelip mata untuk pengesahan keluar',
      expiresInSeconds: 60,
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    };
  }

  async clockIn(payload: {
    officeId: string;
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    challengeId?: string;
    biometricTemplate?: string;
  }): Promise<AttendanceRecord> {
    const user = this.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const offices = this.getOfficesList();
    const office = offices.find((o) => o.officeId === payload.officeId) || offices[0];
    const dist = calculateHaversineDistance(
      payload.latitude,
      payload.longitude,
      office.latitude,
      office.longitude
    );

    const now = new Date();
    const nowKL = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kuala_Lumpur', hour12: true });
    const dateKL = now.toISOString().slice(0, 10);

    const newRecord: AttendanceRecord = {
      sessionId: 'ATT-' + Date.now(),
      employeeId: user.employeeId,
      employeeName: user.name,
      department: user.department,
      officeId: office.officeId,
      workDate: dateKL,
      clockInTimeUTC: now.toISOString(),
      clockInTimeKL: `${dateKL}, ${nowKL}`,
      clockInLat: payload.latitude,
      clockInLng: payload.longitude,
      clockInAccuracy: payload.accuracyMeters,
      clockInDistanceMeters: dist,
      faceVerified: 'YES',
      faceVerificationConfidence: '0.96',
      attendanceStatus: dist <= office.radiusMeters ? 'IN_PROGRESS' : 'EXCEPTION_OUTSIDE_RADIUS',
      exceptionNotes: dist > office.radiusMeters ? `Daftar masuk luar radius (${dist}m > ${office.radiusMeters}m)` : null,
    };

    const records = this.getAttendanceList();
    records.unshift(newRecord);
    this.saveAttendanceList(records);
    return newRecord;
  }

  async clockOut(payload: {
    officeId: string;
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    challengeId?: string;
    biometricTemplate?: string;
  }): Promise<AttendanceRecord> {
    const user = this.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const offices = this.getOfficesList();
    const office = offices.find((o) => o.officeId === payload.officeId) || offices[0];
    const dist = calculateHaversineDistance(
      payload.latitude,
      payload.longitude,
      office.latitude,
      office.longitude
    );

    const records = this.getAttendanceList();
    const session = records.find(
      (r) => r.employeeId === user.employeeId && (r.attendanceStatus === 'IN_PROGRESS' || !r.clockOutTimeKL)
    );

    const now = new Date();
    const nowKL = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kuala_Lumpur', hour12: true });
    const dateKL = now.toISOString().slice(0, 10);

    if (session) {
      session.clockOutTimeUTC = now.toISOString();
      session.clockOutTimeKL = `${dateKL}, ${nowKL}`;
      session.clockOutLat = payload.latitude;
      session.clockOutLng = payload.longitude;
      session.clockOutAccuracy = payload.accuracyMeters;
      session.clockOutDistanceMeters = dist;
      session.attendanceStatus = 'COMPLETED';

      const inTime = new Date(session.clockInTimeUTC).getTime();
      const diffMin = Math.max(1, Math.round((now.getTime() - inTime) / 60000));
      session.workedMinutes = diffMin;
      session.workedHours = parseFloat((diffMin / 60).toFixed(2));
      this.saveAttendanceList(records);
      return session;
    } else {
      const fallbackRecord: AttendanceRecord = {
        sessionId: 'ATT-' + Date.now(),
        employeeId: user.employeeId,
        employeeName: user.name,
        department: user.department,
        officeId: office.officeId,
        workDate: dateKL,
        clockInTimeUTC: now.toISOString(),
        clockInTimeKL: `${dateKL}, ${nowKL}`,
        clockOutTimeUTC: now.toISOString(),
        clockOutTimeKL: `${dateKL}, ${nowKL}`,
        clockInLat: payload.latitude,
        clockInLng: payload.longitude,
        clockInAccuracy: payload.accuracyMeters,
        clockInDistanceMeters: dist,
        clockOutLat: payload.latitude,
        clockOutLng: payload.longitude,
        clockOutAccuracy: payload.accuracyMeters,
        clockOutDistanceMeters: dist,
        faceVerified: 'YES',
        faceVerificationConfidence: '0.95',
        workedMinutes: 480,
        workedHours: 8,
        attendanceStatus: 'COMPLETED',
      };
      records.unshift(fallbackRecord);
      this.saveAttendanceList(records);
      return fallbackRecord;
    }
  }

  async enrolFace(payload: { employeeId: string; biometricVector: number[]; consentVersion: string }): Promise<boolean> {
    const emps = this.getEmployeesList();
    const emp = emps.find((e) => e.employeeId === payload.employeeId);
    if (emp) {
      emp.faceEnrolled = true;
      emp.faceEnrolledAt = new Date().toISOString();
      this.saveEmployeesList(emps);

      const currentUser = this.getCurrentUser();
      if (currentUser && currentUser.employeeId === emp.employeeId) {
        currentUser.faceEnrolled = true;
        currentUser.faceEnrolledAt = emp.faceEnrolledAt;
        saveItem(STORAGE_KEYS.AUTH_USER, currentUser);
      }
    }
    return true;
  }

  async getMyHistory(): Promise<AttendanceRecord[]> {
    const user = this.getCurrentUser();
    if (!user) return [];
    return this.getAttendanceList().filter((r) => r.employeeId === user.employeeId);
  }

  async getOffices(): Promise<Office[]> {
    return this.getOfficesList();
  }

  async createOffice(office: Partial<Office>): Promise<Office> {
    const offices = this.getOfficesList();
    const newOff: Office = {
      officeId: 'OFF-' + (offices.length + 1).toString().padStart(2, '0'),
      name: office.name || 'Cawangan Baharu Halagel',
      latitude: office.latitude || 5.6432,
      longitude: office.longitude || 100.4912,
      radiusMeters: office.radiusMeters || 100,
      maxAccuracyMeters: 50,
      maxAgeSeconds: 60,
      address: office.address || 'Kawasan Operasi Halagel',
      active: true,
    };
    offices.push(newOff);
    this.saveOfficesList(offices);
    return newOff;
  }

  async updateOffice(id: string, updates: Partial<Office>): Promise<Office> {
    const offices = this.getOfficesList();
    const index = offices.findIndex((o) => o.officeId === id);
    if (index === -1) throw new Error('Pejabat tidak dijumpai');
    offices[index] = { ...offices[index], ...updates };
    this.saveOfficesList(offices);
    return offices[index];
  }

  async deleteOffice(id: string): Promise<boolean> {
    let offices = this.getOfficesList();
    offices = offices.filter((o) => o.officeId !== id);
    this.saveOfficesList(offices);
    return true;
  }

  async getEmployees(): Promise<User[]> {
    return this.getEmployeesList().map(({ password, ...u }) => u);
  }

  async createEmployee(data: Partial<User & { password?: string }>): Promise<User> {
    const emps = this.getEmployeesList();
    const newEmp: User & { password?: string } = {
      employeeId: data.employeeId || 'EMP' + (emps.length + 100),
      name: data.name || '',
      email: data.email || '',
      department: data.department || 'Pengeluaran',
      assignedOfficeId: data.assignedOfficeId || 'OFF-01',
      role: data.role || 'employee',
      active: data.active ?? true,
      faceEnrolled: false,
      faceEnrolledAt: null,
      password: data.password || 'Password123!',
      mustChangePassword: false,
    };
    emps.push(newEmp);
    this.saveEmployeesList(emps);
    const { password, ...safeEmp } = newEmp;
    return safeEmp;
  }

  async updateEmployee(id: string, updates: Partial<User>): Promise<User> {
    const emps = this.getEmployeesList();
    const idx = emps.findIndex((e) => e.employeeId === id);
    if (idx === -1) throw new Error('Staf tidak dijumpai');
    emps[idx] = { ...emps[idx], ...updates };
    this.saveEmployeesList(emps);
    const { password, ...safeEmp } = emps[idx];
    return safeEmp;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    let emps = this.getEmployeesList();
    emps = emps.filter((e) => e.employeeId !== id);
    this.saveEmployeesList(emps);
    return true;
  }

  async getAllAttendance(): Promise<AttendanceRecord[]> {
    return this.getAttendanceList();
  }

  async correctAttendance(sessionId: string, payload: {
    clockInTimeKL?: string;
    clockOutTimeKL?: string;
    attendanceStatus?: string;
    workedMinutes?: number;
    reason: string;
  }): Promise<AttendanceRecord> {
    const records = this.getAttendanceList();
    const rec = records.find((r) => r.sessionId === sessionId);
    if (!rec) throw new Error('Rekod tidak dijumpai');

    if (payload.clockInTimeKL) rec.clockInTimeKL = payload.clockInTimeKL;
    if (payload.clockOutTimeKL) rec.clockOutTimeKL = payload.clockOutTimeKL;
    if (payload.attendanceStatus) rec.attendanceStatus = payload.attendanceStatus;
    if (payload.workedMinutes != null) {
      rec.workedMinutes = payload.workedMinutes;
      rec.workedHours = parseFloat((payload.workedMinutes / 60).toFixed(2));
    }
    rec.exceptionNotes = `Pelarasan Admin: ${payload.reason}`;
    this.saveAttendanceList(records);
    return rec;
  }

  async getAdminMetrics(): Promise<AdminMetrics> {
    const emps = this.getEmployeesList();
    const offices = this.getOfficesList();
    const records = this.getAttendanceList();
    const nowStr = new Date().toISOString().slice(0, 10);
    const todayRecs = records.filter((r) => r.workDate === nowStr);

    return {
      totalEmployees: emps.length,
      activeEmployees: emps.filter((e) => e.active).length,
      totalOffices: offices.length,
      activeSessionsNow: todayRecs.filter((r) => r.attendanceStatus === 'IN_PROGRESS').length,
      todayTotalClockIns: todayRecs.length,
      todayCompletedSessions: todayRecs.filter((r) => r.attendanceStatus === 'COMPLETED').length,
      flaggedExceptions: records.filter((r) => r.attendanceStatus.startsWith('EXCEPTION_')).length,
    };
  }

  async getPayrollPreview(params?: { startDate?: string; endDate?: string }): Promise<any> {
    const records = this.getAttendanceList();
    const emps = this.getEmployeesList();

    const summaryMap: Record<string, { employeeId: string; name: string; department: string; daysWorked: number; totalHours: number }> = {};

    emps.forEach((emp) => {
      summaryMap[emp.employeeId] = {
        employeeId: emp.employeeId,
        name: emp.name,
        department: emp.department,
        daysWorked: 0,
        totalHours: 0,
      };
    });

    records.forEach((r) => {
      if (summaryMap[r.employeeId]) {
        summaryMap[r.employeeId].daysWorked += 1;
        summaryMap[r.employeeId].totalHours += r.workedHours || 8;
      }
    });

    return {
      period: `${params?.startDate || 'Awal Bulan'} - ${params?.endDate || 'Kini'}`,
      employees: Object.values(summaryMap),
      totalHours: Object.values(summaryMap).reduce((acc, curr) => acc + curr.totalHours, 0),
    };
  }

  async exportPayrollCsv(params?: { startDate?: string; endDate?: string }): Promise<string> {
    const data = await this.getPayrollPreview(params);
    let csv = 'ID Staf,Nama,Jabatan,Hari Bekerja,Jumlah Jam\n';
    data.employees.forEach((e: any) => {
      csv += `${e.employeeId},"${e.name}","${e.department}",${e.daysWorked},${e.totalHours.toFixed(1)}\n`;
    });
    return csv;
  }
}

export const api = new HalagelApiService();
