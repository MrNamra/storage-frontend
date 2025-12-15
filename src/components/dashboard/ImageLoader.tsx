import React, {useState} from 'react';
import axios from 'axios';
import {fetchDataFromAPI} from '@/lib/api';

const ImageLoader: React.FC<{fileId: string}> = ({fileId}) => {
  const [imageData, setImageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchImageData = async () => {
    try {
      setLoading(true);
      setError(false);

      const response = await fetchDataFromAPI(
        `thumbnail/${fileId}`,
        'get',
        '',
        '',
      );

      //const response = await axios.get(`/api/thumbnail/${fileId}`);

      if (response) {
        console.log('Image data received:', response);
        setImageData(response);
      } else {
        console.log('No image data received');
      }
    } catch (err) {
      setError(true);
      console.log('Error: ' + err);
      setImageData(null);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchImageData();
  }, [fileId]);

  return (
    <>
      {loading && (
        <img
          src="https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png"
          alt="Base64 Thumbnail"
          style={{width: '100px', height: 'auto'}}
        />
      )}

      {/*
        
        {error && !loading && (
            <div
            style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: 'red',
            }}>
            <span>Error</span> 
            </div>
        )}
        */}

      {!loading && !error && imageData && (
        <img
          src={imageData}
          alt="Loaded Image"
          style={{
            width: '50px', // You can adjust the size (e.g., 100px, 150px, etc.)
            height: '50px',
            objectFit: 'cover', // Or 'contain', depending on the desired fit
          }}
        />
      )}
    </>
  );
};

export default ImageLoader;
