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
} from '../controllers/team.controller.js';


const router: Router = express.Router();

router.use(checkAuth);

router.post('/', createTeam);
router.get('/', listMyTeams);

router.get('/:teamId', getTeam);
router.put('/:teamId',  updateTeam);
router.delete('/:teamId', deleteTeam);

router.get('/:teamId/members', getMembers);
router.post('/:teamId/members', addMember);
router.delete('/:teamId/members/:memberId', removeMember);
router.patch('/:teamId/members/:memberId', updateMemberRole);

export default router;