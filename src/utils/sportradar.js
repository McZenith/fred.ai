export const SPORTRADAR_HEADERS = {
  accept: '*/*',
  'accept-language': 'en-US,en;q=0.9',
  'if-modified-since': new Date().toUTCString(),
  'if-none-match': `"${Math.random().toString(36)}"`,
  origin: 'https://www.sportybet.com',
  priority: 'u=1, i',
  referer: 'https://www.sportybet.com/',
  'sec-ch-ua':
    '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'cross-site',
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
};

export const BASE_URL = 'https://lmt.fn.sportradar.com/common/en/Etc:UTC/gismo';

export const SPORTRADAR_API_KEY = `?T=exp=1733068869~acl=/*~data=eyJvIjoiaHR0cHM6Ly93d3cuc3BvcnR5YmV0LmNvbSIsImEiOiI2Mzg4NDZiOTNiMjNlY2ZjOTRjZTFhNmQ0NWIxZGJlNiIsImFjdCI6Im9yaWdpbmNoZWNrIiwib3NyYyI6Im9yaWdpbiJ9~hmac=713a0115bc7dbfb6d651250eaf22b05cc798150774d2b35b0338814382590724`;

export const handleError = (error) => {
  const statusCode = error.response?.status || 500;
  const errorMessage = error.response?.data?.message || 'Internal Server Error';

  return {
    status: 'error',
    message: errorMessage,
    code: statusCode,
  };
};

export const validateId = (id, type) => {
  if (!id) {
    throw {
      status: 400,
      message: `${type} ID is required`,
    };
  }
};
