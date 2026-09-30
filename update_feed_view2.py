import io
with io.open('frontend/src/components/Feed/JobFeedView.jsx', 'r', encoding='utf-8') as f: c = f.read()
old = '''const JobFeedView = ({ currentUser, onStartDirectChat, onOpenAuth, onPhotoSelected }) => {'''
new = '''import { getCurrentUser } from '../../services/authService';\n\nconst JobFeedView = ({ currentUser, onStartDirectChat, onOpenAuth, onPhotoSelected, onUserUpdated }) => {'''
c = c.replace(old, new)
old_del = '''      await deleteJob(jobId);\n      setJobs(prev => prev.filter(j => j.id !== jobId));\n      alert('Vacante eliminada exitosamente.');\n    } catch'''
new_del = '''      await deleteJob(jobId);\n      setJobs(prev => prev.filter(j => j.id !== jobId));\n      alert('Vacante eliminada exitosamente.');\n      getCurrentUser().then(user => {\n        if (user && onUserUpdated) onUserUpdated(user);\n      }).catch(e => console.error(e));\n    } catch'''
c = c.replace(old_del, new_del)
with io.open('frontend/src/components/Feed/JobFeedView.jsx', 'w', encoding='utf-8') as f: f.write(c)

