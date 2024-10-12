import axios from 'axios';

export async function GET() {
  try {
    const url =
      'https://www.sportybet.com/api/ng/factsCenter/liveOrPrematchEvents?sportId=sr%3Asport%3A1&_t=1728743622441';

    // Make the GET request with the required headers
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie:
          'locale=en; _gcl_au=1.1.837683890.1725073688; sb_fs_id=641671b6-a199-4c75-8eb2-268a4439353f; sb_fs_flag=false; device-id=44344fd8-b0c5-4a87-8e60-aae61b1a5021; sb_country=ng; redirect_to_int=1; deviceId=240831113553bdid47845506; phone=8140386325; _ga=GA1.1.2122706011.1725073688; usrId=241005123811pdid35173076; userCert=350; userId=180801025402puid03035383; selfExclusionEndDate=0; accessToken=patron:id:accesstoken:2012b742e6b49fe308b680a7040e6993vCpzKw4ZGiPrBveByg3P3xqphkIaoMX/vVHvJgt6AjLEcBZFnt05B55GZvip9xcGvyhTgKSafVpseG2fqckTpw==; refreshToken=patron:id:refreshtoken:356c79503cff4f8786d6c8ac9951b96f; _ga_26P5XCJ25M=GS1.1.1728740146.10.1.1728741182.56.0.0; _ga_NBP9M63NMT=GS1.1.1728740077.10.1.1728743610.0.0.0; _ga_00HZ52K43N=GS1.1.1728740075.13.1.1728743622.47.0.0; _ga_D9PX9RRZRJ=GS1.1.1728740075.13.1.1728743622.0.0.0',
      },
    });

    // Send the response data back to the client
    return Response.json(response.data);
  } catch (error) {
    console.error('Error fetching data:', error);
    return Response.json({ message: 'Error fetching data' }, { status: 500 });
  }
}
