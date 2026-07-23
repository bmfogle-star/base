import { useState } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';
import Playbook from './pages/Playbook';
import PlayDetail from './pages/PlayDetail';
import PlayEditor from './pages/PlayEditor';
import Study from './pages/Study';
import PlaybookSettings from './pages/PlaybookSettings';
import { usePlays } from './hooks/usePlays';
import { getProfile } from './data/playbook';
import './index.css';

export default function App() {
  const [page, setPage] = useState('home');
  const [selectedId, setSelectedId] = useState(null);   // play being viewed
  const [editId, setEditId] = useState(null);           // play being edited (null = new)
  const [studyId, setStudyId] = useState(null);         // single-play study target
  const [browseCat, setBrowseCat] = useState(null);     // pending category filter for Playbook
  const [profile, setProfile] = useState(() => getProfile());

  const { plays, add, update, remove } = usePlays();
  const selected = plays.find(p => p.id === selectedId);
  const editing = editId ? plays.find(p => p.id === editId) : null;

  function nav(p) {
    setPage(p);
    setSelectedId(null);
    setStudyId(null);
    if (p !== 'playbook') setBrowseCat(null);
  }

  function openPlay(id) {
    setSelectedId(id);
    setPage('detail');
  }

  function startNewPlay() {
    setEditId(null);
    setPage('editor');
  }

  function editPlay(id) {
    setEditId(id);
    setPage('editor');
  }

  function savePlay(data) {
    if (editing) {
      const saved = update({ ...editing, ...data });
      setSelectedId(saved.id);
    } else {
      const created = add(data);
      setSelectedId(created.id);
    }
    setEditId(null);
    setPage('detail');
  }

  function deletePlay(id) {
    remove(id);
    setEditId(null);
    setSelectedId(null);
    setPage('playbook');
  }

  function toggleStar(play) {
    update({ ...play, starred: !play.starred });
  }

  function studyPlay(id) {
    setStudyId(id);
    setPage('study');
  }

  return (
    <Layout page={['detail', 'editor'].includes(page) ? 'playbook' : page} onNav={nav}>
      {page === 'home' && (
        <Home
          plays={plays}
          profile={profile}
          onStudy={() => { setStudyId(null); setPage('study'); }}
          onOpen={openPlay}
          onAdd={startNewPlay}
          onBrowse={(cat) => { setBrowseCat(cat); setPage('playbook'); }}
        />
      )}

      {page === 'playbook' && (
        <Playbook plays={plays} onOpen={openPlay} onAdd={startNewPlay} initialCategory={browseCat} />
      )}

      {page === 'detail' && selected && (
        <PlayDetail
          play={selected}
          onBack={() => setPage('playbook')}
          onEdit={editPlay}
          onStudy={studyPlay}
          onToggleStar={toggleStar}
        />
      )}

      {page === 'editor' && (
        <PlayEditor
          play={editing}
          onSave={savePlay}
          onCancel={() => setPage(editing ? 'detail' : 'playbook')}
          onDelete={deletePlay}
        />
      )}

      {page === 'study' && (
        <Study
          plays={plays}
          profile={profile}
          singlePlayId={studyId}
          onExit={() => { setStudyId(null); setPage(studyId ? 'detail' : 'home'); }}
        />
      )}

      {page === 'settings' && (
        <PlaybookSettings onChanged={() => setProfile(getProfile())} />
      )}
    </Layout>
  );
}
