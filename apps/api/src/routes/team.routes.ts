// apps/api/src/routes/team.routes.ts
import express, { Router } from 'express';
import { checkAuth } from '../middlewares/checkAuth.js';
import { validate } from '../middlewares/validation.js';
import {
  createTeam,
  listMyTeams,
  getTeam,
  updateTeam,
  deleteTeam,
  getMembers,
  addMember,
  removeMember,
  updateMemberRole,
  getOrCreateCurrentOrgTeam,
  getTeamRepositories,
} from '../controllers/team.controller.js';


const router: Router = express.Router();

router.use(checkAuth);

router.post('/', createTeam);
router.get('/', listMyTeams);
router.get('/current', getOrCreateCurrentOrgTeam);

router.get('/:teamId', getTeam);
router.put('/:teamId',  updateTeam);
router.delete('/:teamId', deleteTeam);

router.get('/:teamId/members', getMembers);
router.post('/:teamId/members', addMember);
router.delete('/:teamId/members/:memberId', removeMember);
router.patch('/:teamId/members/:memberId', updateMemberRole);
router.get('/:teamId/repositories', getTeamRepositories);

export default router;