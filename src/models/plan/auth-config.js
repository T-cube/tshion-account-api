import C from 'lib/constants';

export const MODULE_PROJECT = 'module_project';
export const MODULE_TASK = 'module_task';
export const MODULE_DOCUMENT = 'module_document';
export const MODULE_APPROVAL = 'module_approval';
export const MODULE_ANNOUNCEMENT = 'module_announcement';
export const MODULE_ATTENDANCE = 'module_attendance';
export const MODULE_STRUCTURE = 'module_structure';

export default {

  [C.TEAMPLAN.FREE]: [
    MODULE_PROJECT,
    MODULE_TASK,
    MODULE_DOCUMENT,
    MODULE_STRUCTURE,
  ],

  [C.TEAMPLAN.PRO]: [
    MODULE_PROJECT,
    MODULE_TASK,
    MODULE_DOCUMENT,
    MODULE_ANNOUNCEMENT,
    MODULE_STRUCTURE,
  ],

  [C.TEAMPLAN.ENT]: [
    MODULE_PROJECT,
    MODULE_TASK,
    MODULE_DOCUMENT,
    MODULE_APPROVAL,
    MODULE_ANNOUNCEMENT,
    MODULE_ATTENDANCE,
    MODULE_STRUCTURE,
  ],

};
