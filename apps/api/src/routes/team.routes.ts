// apps/api/src/routes/team.routes.ts
import express, { Router } from 'express';
import { checkAuth } from '../middlewares/checkAuth.js';
import {
  getOrCreateCurrentOrgTeam,
  getTeamRepositories,
  getMyTeams,
  addReposInTeam,
} from '../controllers/team.controller.js';


const router: Router = express.Router();

router.use(checkAuth);

router.get('/current', getOrCreateCurrentOrgTeam);
router.get('/mine', getMyTeams);
router.get('/repositories', getTeamRepositories);
router.post('/repositories/add', addReposInTeam);

// router.get('/:teamId', getTeam);
// router.put('/:teamId',  updateTeam);
// router.delete('/:teamId', deleteTeam);

// router.get('/:teamId/members', getMembers);
// router.post('/:teamId/members', addMember);
// router.delete('/:teamId/members/:memberId', removeMember);
// router.patch('/:teamId/members/:memberId', updateMemberRole);
// router.get('/:teamId/repositories', getTeamRepositories);

export default router;