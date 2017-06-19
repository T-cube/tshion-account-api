import C from 'lib/constants';

export const MODULE_HOME = 'home';
export const MODULE_APP_CENTER = 'app-center';
export const MODULE_PROJECT = 'project';
export const MODULE_TASK = 'task';
export const MODULE_DOCUMENT = 'document';
export const MODULE_APPROVAL = 'approval';
export const MODULE_ANNOUNCEMENT = 'announcement';
export const MODULE_ATTENDANCE = 'attendance';
export const MODULE_STRUCTURE = 'structure';
export const MODULE_PROFILE = 'profile';

const AUTH_CONFIG = {

  [C.TEAMPLAN.FREE]: [
    MODULE_HOME,
    MODULE_APP_CENTER,
    MODULE_PROJECT,
    MODULE_TASK,
    MODULE_DOCUMENT,
    MODULE_APPROVAL,
    MODULE_ANNOUNCEMENT,
    MODULE_ATTENDANCE,
    MODULE_STRUCTURE,
    MODULE_PROFILE,
  ],

  [C.TEAMPLAN.PRO]: [
    MODULE_HOME,
    MODULE_APP_CENTER,
    MODULE_PROJECT,
    MODULE_TASK,
    MODULE_DOCUMENT,
    MODULE_APPROVAL,
    MODULE_ANNOUNCEMENT,
    MODULE_ATTENDANCE,
    MODULE_STRUCTURE,
    MODULE_PROFILE,
  ],

  [C.TEAMPLAN.ENT]: [
    MODULE_HOME,
    MODULE_APP_CENTER,
    MODULE_PROJECT,
    MODULE_TASK,
    MODULE_DOCUMENT,
    MODULE_APPROVAL,
    MODULE_ANNOUNCEMENT,
    MODULE_ATTENDANCE,
    MODULE_STRUCTURE,
    MODULE_PROFILE,
  ],

};

export default AUTH_CONFIG;
