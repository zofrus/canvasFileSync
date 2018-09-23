const request = require('request-promise');
const log = require('electron-log');

const getActiveCanvasCourses = async (
  accountDomain,
  developerKey,
) => {
  try {
    const options = {
      method: 'GET',
      uri: `http://${accountDomain}/api/v1/users/self/courses?enrollment_state=active`,
      headers: { Authorization: `Bearer ${developerKey}` },
      json: true,
      encoding: null,
    };
    const activeCoursesResponse = await request(options);
    log.info(activeCoursesResponse);
    return { success: true, message: 'success', response: activeCoursesResponse };
  } catch (error) {
    log.error(error);
    if (
      error.message === '401 - {"errors":[{"message":"Invalid access token."}]}'
    ) {
      return { success: false, message: 'Invalid Developer Key' };
    }
    return { success: false, message: error.message };
  }
};

export default { getActiveCanvasCourses };
