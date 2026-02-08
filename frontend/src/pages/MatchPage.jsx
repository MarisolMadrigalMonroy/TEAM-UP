import { useEffect, useState } from 'react';
import SuggestedUsers from './SuggestedUsers';
import SuggestedProjects from './SuggestedProjects';
import api from '../api';

function MatchPage({ user }) {
  const [ownsProjects, setOwnsProjects] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('user from match ', user)
  if (!user?.id) return;

  const checkOwnership = async () => {
    try {
      const res = await api.get('/api/projects/');
      const userId = Number(user.id);
      console.log('userID ', userId)

      const ownedProjects = res.data.filter(project => {
        const creatorId = project.creator;
        const mentorId = typeof project.mentor === 'object'
          ? project.mentor?.id
          : project.mentor;
        console.log('projectId ', project.id)
        console.log('creatorId ', creatorId)
        console.log('mentorId ', mentorId)
        return creatorId === userId || mentorId === userId;
      });

      setOwnsProjects(ownedProjects.length > 0);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setOwnsProjects(false);
    } finally {
      setLoading(false);
    }
  };

  checkOwnership();
}, [user?.id]);


  if (loading) {
    return <div className="text-center my-5">Loading...</div>;
  }

  return (
    <div className="container py-4">
      {ownsProjects ? (
        <>
          <SuggestedUsers userType="student" />
          <hr />
          <SuggestedUsers userType="mentor" />
        </>
      ) : (
        <SuggestedProjects user={user} />
      )}
    </div>
  );
}

export default MatchPage;
