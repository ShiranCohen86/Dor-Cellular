import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Auth } from '../api/client.js';

export default function UsersPage() {
  const { t } = useTranslation();
  const [data, setData] = useState({ items: [] });

  useEffect(() => {
    async function loadUsers() {
      try {
        const result = await Auth.listUsers();
        setData(result);
      } catch (error) {
        console.error('[UsersPage] Failed to load users:', error);
      }
    }
    loadUsers();
  }, []);

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
              <th>{t('common.name')}</th>
              <th>{t('common.email')}</th>
              <th>{t('users.role')}</th>
              <th>{t('common.phone')}</th>
              <th>{t('users.lastLogin')}</th>
            </tr>
        </thead>
        <tbody>
          {data.items.map((user) => (
            <tr key={user._id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td><span className="badge info">{t(`roles.${user.role}`)}</span></td>
              <td>{user.phone || '—'}</td>
              <td>{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
