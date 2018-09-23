// import { dialog } from 'electron'; // eslint-disable-line
import router from '../../router/index';
import { ipcRenderer } from 'electron'; // eslint-disable-line
const canvasIntegrationFile = require('../../../utils/canvasIntegration');
const canvasIntegration = canvasIntegrationFile.default;
const path = require('path');

const state = {
  main: 0,
  authToken: null,
  rootURL: null,
  rootFolder: null,
  syncFrequency: null,
  filesMap: [],
};

const mutations = {
  DECREMENT_MAIN_COUNTER(state) {
    state.main -= 1;
  },
  INCREMENT_MAIN_COUNTER(state) {
    state.main += 1;
  },
  SET_CONNECTION_PARAMETERS(state, payload) {
    state.authToken = payload.authToken;
    state.rootURL = payload.rootURL;
  },
  SET_ROOT_FOLDER(state, payload) {
    state.rootFolder = payload;
  },
  SET_COURSE_PATHS(state) {
    state.filesMap.forEach((course, index) => {
      state.filesMap[index].path = path.join(state.rootFolder, course.name);
    });
  },
  FIND_SET_SYNCABLE_COURSES(state) {
    state.filesMap.forEach(async (courseItem) => {
      const syncable = await canvasIntegration.hasAccessToFilesAPI(state.rootURL,
        courseItem.id,
        state.authToken);
      console.log(syncable);
      courseItem.sync = syncable;
    });
  },
  SET_ROOT_URL(state, payload) {
    state.rootURL = payload.rootURL;
  },
  SET_SYNC_FREQUENCY(state, payload) {
    state.syncFrequency = payload;
  },
  ADD_COURSE(state, payload) {
    state.filesMap.push(payload);
  },
};

const actions = {
  someAsyncTask({ commit }) {
    // do something async
    commit('INCREMENT_MAIN_COUNTER');
  },
  connect({ commit }, payload) {
    commit('SET_CONNECTION_PARAMETERS', payload);
    canvasIntegration.getActiveCanvasCourses(
      payload.rootURL, payload.authToken).then((response) => {
      if (response.success) {
        console.log(response);
        response.response.forEach((courseItem) => {
          const course = { uuid: courseItem.uuid,
            id: courseItem.id,
            sync: true,
            path: '',
            name: courseItem.name.split('|')[0].trim(),
            items: [],
          };
          commit('ADD_COURSE', course);
        });
        router.push('./configure');
      }
    });
  },
  beginInitialSync({ commit }, payload) {
    commit('SET_ROOT_FOLDER', payload.rootFolder);
    commit('SET_COURSE_PATHS');
    commit('SET_SYNC_FREQUENCY', payload.syncFrequency);
    commit('FIND_SET_SYNCABLE_COURSES');
    router.push('./progress');
  },
  goUniversityLogin({ commit }, payload) {
    commit('SET_ROOT_URL', payload);
    ipcRenderer.send('go-university-login', payload.rootURL);
  },
};

export default {
  state,
  mutations,
  actions,
};
