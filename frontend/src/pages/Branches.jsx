/**
 * Branches listing — small, near-static data cached for 5 minutes.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { loadBranchesIfStale, selectAllBranches } from '../store/slices/branchesSlice.js';

export default function Branches() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const branchList = useSelector(selectAllBranches);

  useEffect(() => { dispatch(loadBranchesIfStale()); }, [dispatch]);

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t('common.name')}</th>
            <th>{t('branches.code')}</th>
            <th>{t('branches.city')}</th>
            <th>{t('common.phone')}</th>
          </tr>
        </thead>
        <tbody>
          {branchList.length === 0 ? (
            <tr><td colSpan="4" className="muted">{t('common.noData')}</td></tr>
          ) : branchList.map((branch) => (
            <tr key={branch._id}>
              <td>{branch.name}</td>
              <td>{branch.code}</td>
              <td>{branch.city || '—'}</td>
              <td>{branch.phone || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
