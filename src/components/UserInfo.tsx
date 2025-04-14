import { useState, useEffect, useMemo, useCallback } from 'react';
import './UserInfo.css';

// 상수 정의
const RETRY_DELAY = 5000;
const MAX_RETRIES = 3;
const UPDATE_INTERVAL = 1000;

// 타입 정의
interface IpInfo {
  ip: string;
  country_name: string;
  city: string;
  region: string;
  timezone: string;
  org: string;
}

interface SystemInfo {
  browser: string;
  os: string;
  deviceType: string;
  connection: string;
  cores: number;
  memory: string;
  orientation: string;
}

// 유틸리티 함수
const getBrowserInfo = (userAgent: string): string => {
  const browsers = {
    chrome: /chrome|chromium/i,
    safari: /safari/i,
    firefox: /firefox/i,
    opera: /opera|opr/i,
    edge: /edg/i,
    ie: /msie|trident/i,
  };

  for (const [browser, regex] of Object.entries(browsers)) {
    if (regex.test(userAgent)) {
      return browser.charAt(0).toUpperCase() + browser.slice(1);
    }
  }
  return 'Unknown';
};

const getOSInfo = (userAgent: string): string => {
  const os = {
    windows: /windows/i,
    mac: /mac/i,
    linux: /linux/i,
    android: /android/i,
    ios: /iphone|ipad|ipod/i,
  };

  for (const [name, regex] of Object.entries(os)) {
    if (regex.test(userAgent)) {
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  }
  return 'Unknown';
};

const getDeviceType = (userAgent: string): string => {
  const mobile = /mobile|android|iphone|ipad|ipod/i;
  const tablet = /tablet|ipad/i;

  if (tablet.test(userAgent)) return '태블릿';
  if (mobile.test(userAgent)) return '모바일';
  return '데스크톱';
};

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  const parts = [];
  if (hours > 0) parts.push(`${hours}시간`);
  if (minutes > 0) parts.push(`${minutes}분`);
  parts.push(`${remainingSeconds}초`);
  
  return parts.join(' ');
};

const UserInfo = () => {
  const [ipInfo, setIpInfo] = useState<IpInfo | null>(null);
  const [ipError, setIpError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [pageLoadTime] = useState(() => {
    const storedTime = localStorage.getItem('pageLoadTime');
    if (storedTime) {
      return new Date(storedTime);
    }
    const now = new Date();
    localStorage.setItem('pageLoadTime', now.toISOString());
    return now;
  });

  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    browser: '',
    os: '',
    deviceType: '',
    connection: '',
    cores: 0,
    memory: '알 수 없음',
    orientation: ''
  });

  // 시스템 정보 메모이제이션
  const initialSystemInfo = useMemo(() => {
    const userAgent = navigator.userAgent;
    const getConnectionInfo = () => {
      if ('connection' in navigator) {
        const conn = (navigator as any).connection;
        if (conn) {
          return `${conn.effectiveType || ''} ${conn.downlink ? `(${conn.downlink}Mbps)` : ''}`.trim() || '알 수 없음';
        }
      }
      return '알 수 없음';
    };

    const getMemoryInfo = () => {
      if ('memory' in navigator) {
        const memory = (navigator as any).deviceMemory;
        return memory ? `${memory}GB` : '알 수 없음';
      }
      return '알 수 없음';
    };

    const getOrientation = () => {
      if (window.screen.orientation) {
        return window.screen.orientation.type.includes('landscape') ? '가로' : '세로';
      }
      return window.innerWidth > window.innerHeight ? '가로' : '세로';
    };

    return {
      browser: getBrowserInfo(userAgent),
      os: getOSInfo(userAgent),
      deviceType: getDeviceType(userAgent),
      connection: getConnectionInfo(),
      cores: navigator.hardwareConcurrency || 0,
      memory: getMemoryInfo(),
      orientation: getOrientation()
    };
  }, []);

  // IP 정보 가져오기
  const fetchIpInfo = useCallback(async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (!res.ok) throw new Error('서버 응답 오류');
      const data = await res.json();
      setIpInfo(data);
      setIpError(null);
      setRetryCount(0);
    } catch (error) {
      setIpError('IP 정보를 가져오는데 실패했습니다');
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchIpInfo();
        }, RETRY_DELAY);
      }
    }
  }, [retryCount]);

  // 방향 변경 핸들러
  const handleOrientation = useCallback(() => {
    setSystemInfo(prev => ({
      ...prev,
      orientation: window.screen.orientation?.type.includes('landscape') ? '가로' : '세로'
    }));
  }, []);

  useEffect(() => {
    // 초기 시스템 정보 설정
    setSystemInfo(initialSystemInfo);

    // IP 정보 가져오기
    fetchIpInfo();

    // 시간 업데이트 타이머
    const timer = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - pageLoadTime.getTime()) / 1000);
      setElapsedTime(diff);
    }, UPDATE_INTERVAL);

    // 초기 시간 설정
    const now = new Date();
    const initialDiff = Math.floor((now.getTime() - pageLoadTime.getTime()) / 1000);
    setElapsedTime(initialDiff);

    // 이벤트 리스너 등록
    window.addEventListener('orientationchange', handleOrientation);
    window.addEventListener('resize', handleOrientation);

    return () => {
      clearInterval(timer);
      window.removeEventListener('orientationchange', handleOrientation);
      window.removeEventListener('resize', handleOrientation);
    };
  }, [pageLoadTime, initialSystemInfo, fetchIpInfo, handleOrientation]);

  // 메모이제이션된 시간 포맷
  const formattedTime = useMemo(() => formatTime(elapsedTime), [elapsedTime]);

  return (
    <div className="user-info">
      <div className="user-info-summary">
        <span className="user-info-ip">
          {ipError ? '오류 발생' : (ipInfo?.ip || '로딩 중...')}
        </span>
        <span className="user-info-browser">{systemInfo.browser}</span>
        <span className="user-info-time">{formattedTime}</span>
      </div>

      <div className="user-info-details">
        <div className="info-section">
          <div className="info-section-title">방문 정보</div>
          <div className="info-row">
            <span className="info-label">체류 시간</span>
            <span className="info-value highlight">{formattedTime}</span>
          </div>
        </div>

        <div className="info-section">
          <div className="info-section-title">네트워크 정보</div>
          <div className="info-row">
            <span className="info-label">IP</span>
            <span className="info-value">
              {ipError ? '오류 발생' : (ipInfo?.ip || '로딩 중...')}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">위치</span>
            <span className="info-value">
              {ipError ? '오류 발생' : (ipInfo ? `${ipInfo.city}, ${ipInfo.region}, ${ipInfo.country_name}` : '로딩 중...')}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">시간대</span>
            <span className="info-value">
              {ipError ? '오류 발생' : (ipInfo?.timezone || '로딩 중...')}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">ISP</span>
            <span className="info-value">
              {ipError ? '오류 발생' : (ipInfo?.org || '로딩 중...')}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">연결</span>
            <span className="info-value">{systemInfo.connection}</span>
          </div>
        </div>

        <div className="info-section">
          <div className="info-section-title">시스템 정보</div>
          <div className="info-row">
            <span className="info-label">기기</span>
            <span className="info-value">{systemInfo.deviceType}</span>
          </div>
          <div className="info-row">
            <span className="info-label">OS</span>
            <span className="info-value">{systemInfo.os}</span>
          </div>
          <div className="info-row">
            <span className="info-label">플랫폼</span>
            <span className="info-value">{navigator.platform}</span>
          </div>
          <div className="info-row">
            <span className="info-label">브라우저</span>
            <span className="info-value">{systemInfo.browser}</span>
          </div>
          <div className="info-row">
            <span className="info-label">언어</span>
            <span className="info-value">{navigator.language}</span>
          </div>
        </div>

        <div className="info-section">
          <div className="info-section-title">하드웨어 정보</div>
          <div className="info-row">
            <span className="info-label">CPU 코어</span>
            <span className="info-value">{systemInfo.cores}개</span>
          </div>
          <div className="info-row">
            <span className="info-label">메모리</span>
            <span className="info-value">{systemInfo.memory}</span>
          </div>
          <div className="info-row">
            <span className="info-label">화면</span>
            <span className="info-value">{systemInfo.orientation}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserInfo; 