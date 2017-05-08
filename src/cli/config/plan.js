import C from 'lib/constants';

export default[
  {
    name: '免费版',
    type: C.TEAMPLAN.FREE,
    description: '免费团队，可使用T立方的基本功能',
    default_member: 10,
    project_actived: 10,
    project_all: 20,
    store: 10737418240, // 10G
    project_store: 104857600, // 100M
    inc_member_store: 0,
    max_file_size: 5242880, // 5M
    max_member: 10,
  },
  {
    name: '专业版',
    type: C.TEAMPLAN.PRO,
    description: '专业版团队',
    default_member: 10,
    project_actived: 50,
    project_all: 100,
    store: 21474836480, // 20G
    project_store: 524288000, // 500M
    inc_member_store: 0,
    max_file_size: 10485760, // 10M
    max_member: 50,
    ext_info: '专业版',
  },
  {
    name: '企业版',
    type: C.TEAMPLAN.ENT,
    description: '企业版团队',
    default_member: 10,
    project_actived: 100,
    project_all: 200,
    store: 107374182400, // 100G
    project_store: 1073741824, // 1G
    inc_member_store: 1073741824, // 1G
    max_file_size: 20971520, // 20M
    max_member: 100,
    ext_info: '企业版',
  },
];
