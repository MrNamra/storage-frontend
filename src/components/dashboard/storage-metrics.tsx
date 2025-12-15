'use client';

import {motion} from 'framer-motion';
import {HardDrive, Database, Files, Activity} from 'lucide-react';
import {Progress} from '@/components/ui/progress';
import {fetchDataFromAPI} from '@/lib/api';
import {getUser} from '@/lib/constants';
import {useEffect, useState} from 'react';

export function StorageMetrics() {
  const user = JSON.parse(getUser());
  const [dashboard, setDashboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi();
  }, []);

  const dashboardApi = () => {
    setLoading(true);
    fetchDataFromAPI('users/dashboard', 'get', '', user)
      .then((res) => {
        console.log('res', res);
        setDashboard(res.data);
        setLoading(false);
      })
      .catch((error) => {
        console.log('error', error);
        setLoading(false);

      });
  };

  const metrics = [
    {
      title: 'Storage Used',
      value: dashboard?.totalStorage?.toFixed(2) || 0 + 'MB',
      total: '1 TB',
      progress: 45.82,
      icon: HardDrive,
      color: 'text-teal-400',
    },
    {
      title: 'Total Buckets',
      value: dashboard?.totalBuckets,
      icon: Database,
      color: 'text-purple-600',
    },
    {
      title: 'Total Files',
      value: dashboard?.totalFiles,
      icon: Files,
      color: 'text-orange-400',
    },
    // {
    //   title: 'Recent Activity',
    //   value: '24',
    //   subtitle: 'actions today',
    //   icon: Activity,
    //   color: 'text-blue-400',
    // },
  ];

  return (
    <>
    {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <span className="loader h-8 w-8 border-4 border-t-purple-500 border-white rounded-full animate-spin"></span>
        </div>
      )}

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.title}
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: index * 0.1}}
          className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                {metric.title}
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-gray-900">
                {metric.value}
                {metric.total && (
                  <span className="text-sm text-gray-500 ml-1">
                    / {metric.total}
                  </span>
                )}
              </h3>
              {metric.subtitle && (
                <p className="text-sm text-gray-500">{metric.subtitle}</p>
              )}
              {metric.progress !== undefined && (
                <div className="mt-4">
                  <Progress value={metric.value} className="h-2" />
                </div>
              )}
            </div>
            <metric.icon className={`h-8 w-8 ${metric.color}`} />
          </div>
        </motion.div>
      ))}
    </div>
    </>

  );
}
