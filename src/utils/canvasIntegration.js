const request = require('request-promise');
const log = require('electron-log');

const getActiveCanvasCourses = async (
  accountDomain,
  authToken,
) => {
  try {
    const options = {
      method: 'GET',
      uri: `http://${accountDomain}/api/v1/users/self/courses?enrollment_state=active`,
      headers: { Authorization: `Bearer ${authToken}` },
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

const hasAccessToFilesAPI = async (rootURL, courseID, authToken) => {
  const options = {
    method: 'GET',
    uri: `http://${rootURL}/api/v1/courses/${courseID}/files?sort=updated_at&order=desc`,
    headers: { Authorization: `Bearer ${authToken}` },
    json: true,
    encoding: null,
  };
  try {
    await request(options);
    return true;
  } catch (err) {
    if (err === 'StatusCodeError: 401 - {"status":"unauthorized","errors":[{"message":"user not authorized to perform that action"}]}') {
      return false;
    } log.error(err);
  }
  return false;
};

export default { getActiveCanvasCourses, hasAccessToFilesAPI };
