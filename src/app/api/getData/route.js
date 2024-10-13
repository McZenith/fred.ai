import axios from 'axios';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const url =
      'https://www.sportybet.com/api/ng/factsCenter/liveOrPrematchEvents?sportId=sr%3Asport%3A1&_t=1728743622441';

    // Make the GET request with the required headers
    const response = await axios.get(url, {
      headers: {
        Connection: 'keep-alive',
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie:
          'locale=en; _gcl_au=1.1.837683890.1725073688; sb_fs_id=641671b6-a199-4c75-8eb2-268a4439353f; sb_fs_flag=false; device-id=44344fd8-b0c5-4a87-8e60-aae61b1a5021; sb_country=ng; redirect_to_int=1; deviceId=240831113553bdid47845506; phone=8140386325; _ga=GA1.1.2122706011.1725073688; usrId=241005123811pdid35173076; cg=0; _ga_26P5XCJ25M=GS1.1.1728773656.14.1.1728776190.60.0.0; _ga_NBP9M63NMT=GS1.1.1728775014.14.1.1728776202.0.0.0; _ga_00HZ52K43N=GS1.1.1728773655.17.1.1728776206.44.0.0; _ga_D9PX9RRZRJ=GS1.1.1728773656.17.1.1728776206.0.0.0',
      },
    });

    // Send the response data back to the client
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json(
      { message: 'Error fetching data' },
      { status: 500 }
    );
  }
}

export const revalidate = 0;

