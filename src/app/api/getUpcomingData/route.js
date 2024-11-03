import axios from 'axios';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const pageSize = 100;
    const pageLimit = 9; // Total pages you want to retrieve

    // Array to hold all promises for each page request
    const requests = [];

    for (let pageNum = 1; pageNum <= pageLimit; pageNum++) {
      const url = `https://www.sportybet.com/api/ng/factsCenter/pcUpcomingEvents?sportId=sr%3Asport%3A1&marketId=1%2C18%2C10%2C29%2C11%2C26%2C36%2C14%2C60100&pageSize=${pageSize}&pageNum=${pageNum}&option=1&timeline=24&_t=1729977085000`;

      // Create a GET request promise for each page
      requests.push(
        axios.get(url, {
          headers: {
            Connection: 'keep-alive',
            'Content-Type': 'application/x-www-form-urlencoded',
            Cookie:
              'locale=en; _gcl_au=1.1.837683890.1725073688; sb_fs_id=641671b6-a199-4c75-8eb2-268a4439353f; sb_fs_flag=false; device-id=44344fd8-b0c5-4a87-8e60-aae61b1a5021; sb_country=ng; redirect_to_int=1; deviceId=240831113553bdid47845506; phone=8140386325; _ga=GA1.1.2122706011.1725073688; usrId=240831113553pdid47845507; JSESSIONID=B7FEEB93594A665101288B831F9C9DA2; userCert=350; accessToken=patron:id:accesstoken:a928f2d58929feb5ac45602524734933YjCP8yvgdcewQf/lDN48iYB1CtYkjtnu0HXgLQnrpDbcI9q6D5iZrql0CIohEB6l5MqyqqML2rEJEBnXlAk6FA==; refreshToken=patron:id:refreshtoken:bb835422bd094384ab0b9c6b300eb433; userId=180801025402puid03035383; selfExclusionEndDate=0; cg=0; _ga_NBP9M63NMT=GS1.1.1729890037.4.1.1729890544.0.0.0; _ga_26P5XCJ25M=GS1.1.1729890041.12.1.1729890925.60.0.0; _ga_00HZ52K43N=GS1.1.1729890037.11.1.1729890925.26.0.0; _ga_D9PX9RRZRJ=GS1.1.1729890037.11.1.1729890925.0.0.0',
          },
        })
      );
    }

    // Await all requests simultaneously
    const responses = await Promise.all(requests);

    // Combine all tournaments from each page into one array
    const allTournaments = responses.flatMap(
      (response) => response.data.data?.tournaments || []
    );
    const totalNum = responses[0]?.data.data?.totalNum || 0;

    // Construct the final response object to match the initial structure
    const finalResponse = {
      bizCode: 10000,
      message: '0#0',
      data: {
        totalNum: totalNum,
        tournaments: allTournaments,
      },
    };

    // Send the accumulated response data back to the client
    return NextResponse.json(finalResponse);
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json(
      { message: 'Error fetching data' },
      { status: 500 }
    );
  }
}

export const revalidate = 0;
