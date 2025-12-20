"use client";

import { useEffect, useState } from "react";
import {
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  Share,
  StopCircle,
  Copy,
  View,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchDataFromAPI } from "@/lib/api";
import constants, { getUser } from "@/lib/constants";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import toast, { Toaster } from "react-hot-toast";
import { front_url } from "../../lib/api"
import { base_url } from "../../lib/api"
export function BucketList() {
  const user = JSON.parse(getUser());

  const [buckets, setBuckets] = useState([]);
  const [editingBucketId, setEditingBucketId] = useState(null);
  {
    /*
    const [searchQuery, setSearchQuery] = useState('');
    */
  }

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpenShare, setIsModalShare] = useState(false);
  const [bucketName, setBucketName] = useState("");
  const [bucketPassword, setBucketPassword] = useState("");

  const [error, setError] = useState("");
  const [errorCreated, setErrorCreated] = useState("");

  const [loading, setLoading] = useState(false); // State for loading
  const navigate = useNavigate();

  const logout = async () => {
    localStorage.removeItem(constants.USER);
    navigate("/");
    window.location.reload();
  };

  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "asc",
  });

  const handleSort = (key: string) => {
    setSortConfig({
      key,
      direction:
        sortConfig.key === key && sortConfig.direction === "asc"
          ? "desc"
          : "asc",
    });
  };

  useEffect(() => {
    renderTableBody();
  }, []);

  const renderTableBody = () => {
    fetchDataFromAPI("user/dashboard", "get", "", user)
      .then((res) => {
        console.log("res", res);
        setBuckets(res?.data?.bucket);
      })
      .catch((error) => {
        console.log("error", error);

        if (error?.status === 401) {
          // Perform logout
          logout();
        }
      });
  };

  const handleDelete = (id) => {
    fetchDataFromAPI(`bucket/delete/${id}`, "post", "", user)
      .then((res) => {
        console.log("res", res);
        renderTableBody();
      })
      .catch((error) => {
        console.log("error", error);

        if (error?.status === 401) {
          // Perform logout
          logout();
        }
      });
  };

  const handleCloseModal = () => {
    setBucketName("");
    setError("");
    setErrorCreated("");
    setIsModalOpen(false);
    setIsModalShare(false);
  };

  const handleEdit = (id, name) => {
    setBucketName(name);
    setEditingBucketId(id); // Store the ID of the bucket being edited
    setIsModalOpen(true);
  };

  const handleShare = (id) => {
    setBucketPassword("");
    setEditingBucketId(id); // Store the ID of the bucket being edited
    setIsModalShare(true);
  };

  // const handleStop = (id) => {
  //   setBucketPassword('');
  //   setCode(id); // Store the ID of the bucket being edited
  //   // setIsModalShare(true);
  // };

  const handleShreStop = (code) => {
    fetchDataFromAPI(`bucket/end-share/${code}`, "post", "", user)
      .then((res) => {
        toast.success(res?.message);
        // console.log("response:", res);

        // setLoading(false); // Set loading state to false
        renderTableBody(); // Refresh the bucket list
      })
      .catch((error) => {
        toast.error(res?.message);
        console.error("Error updating bucket:", error);
        setLoading(false); // Set loading state to false
        if (error?.status === 401) {
          // Perform logout on unauthorized error
          logout();
        } else {
          setError("An error occurred while updating the bucket.");
        }
      });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!bucketName.trim()) {
      setErrorCreated("Bucket name is required.");
      return;
    }

    setErrorCreated("");
    setLoading(true); // Set loading state to true

    const body = {
      name: bucketName,
    };

    fetchDataFromAPI(`bucket/edit/${editingBucketId}`, "post", body, user)
      .then((res) => {
        console.log("Edit response:", res);
        setIsModalOpen(false); // Close modal
        setLoading(false); // Set loading state to false
        renderTableBody(); // Refresh the bucket list
        toast.success(res?.message)
      })
      .catch((error) => {
        console.error("Error updating bucket:", error);
        setLoading(false); // Set loading state to false
        if (error?.status === 401) {
          // Perform logout on unauthorized error
          logout();
        } else {
          toast.success(error?.response?.data?.message)
          setError("An error occurred while updating the bucket.");
        }
      });
  };

  const handleShareApi = (e) => {
    e.preventDefault();

    // if (!bucketPassword.trim()) {
    //   setError("Bucket password is required.");
    //   return;
    // }

    setError("");
    setLoading(true); // Set loading state to true

    const body = {
      bucket_id: editingBucketId,
      password: bucketPassword,
    };

    fetchDataFromAPI(`bucket/share`, "post", body, user)
      .then(async (res) => {
        
        toast.success(res?.message);

        // const url = `http://localhost:5173/bucket/${res.code}`;
        const url = `${base_url}/bucket/${res?.data?.code}`;

        if (url && isValidURL(url)) {
          // Copy the URL to the clipboard
          await navigator.clipboard.writeText(url);
          console.log("URL copied to clipboard:", url);
        } else {
          console.error("Invalid URL:", url);
        }

        setIsModalShare(false); // Close modal
        setLoading(false); // Set loading state to false
        renderTableBody(); // Refresh the bucket list
      })
      .catch((error) => {
        console.error("Error updating bucket:", error);
        setLoading(false); // Set loading state to false
        if (error?.status === 401) {
          // Perform logout on unauthorized error
          logout();
        } else {
          setError("An error occurred while updating the bucket.");
        }
      });
  };

  // Helper function to validate the URL
  const isValidURL = (url) => {
    try {
      new URL(url); // Try to create a URL object
      return true;
    } catch {
      return false; // Invalid URL
    }
  };

  const btnCopy = async (code) => {
    const url = `${ front_url }/bucket/${code}`;

    if (url && isValidURL(url)) {
      // Copy the URL to the clipboard
      toast.success('URL copied to clipboard!');
      await navigator.clipboard.writeText(url);
    } else {
      console.error("Invalid URL:", url);
    }
  };

  const handleView = (id) => {
    navigate(`/mybucket/${id}`);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/*
    
      <div className="max-w-xl w-full mx-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            type="search"
            placeholder="Search files and folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
      </div>
        */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="cursor-pointer"
              onClick={() => handleSort("name")}
            >
              <div className="flex items-center space-x-2">
                <span>Name</span>
                {sortConfig.key === "name" &&
                  (sortConfig.direction === "asc" ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  ))}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer"
              onClick={() => handleSort("created")}
            >
              <div className="flex items-center space-x-2">
                <span>Created</span>
                {sortConfig.key === "created" &&
                  (sortConfig.direction === "asc" ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  ))}
              </div>
            </TableHead>
            {/* <TableHead>Size</TableHead> */}
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {buckets.map((bucket) => (
            <TableRow key={bucket.id}>
              <TableCell className="font-medium" onClick={() => handleView(bucket?.id)} >{bucket.bucketName}</TableCell>
              <TableCell>
                {moment(bucket.createdAt).format("DD/MM/YYYY")}
              </TableCell>
              {/* <TableCell>{bucket.storage?.toFixed(2)}</TableCell> */}
              <TableCell>
                {bucket?.code !== null ? (
                  <>
                    <span
                      role="button"
                      onClick={() => btnCopy(bucket?.code)}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                    >
                      Shared <Copy size={15} className="ms-1" />
                    </span>
                  </>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Private
                  </span>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger className="focus:outline-none">
                    <MoreVertical className="h-5 w-5 text-gray-500" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {bucket?.code !== null && (
                      <DropdownMenuItem
                        onClick={() => handleShreStop(bucket?.code)}
                      >
                        <StopCircle className="h-4 w-4 mr-2" />
                        Stop
                      </DropdownMenuItem>
                    )}

                    {bucket?.code === null && (
                      <DropdownMenuItem
                        onClick={() => handleShare(bucket?.id)}
                      >
                        <Share className="h-4 w-4 mr-2" />
                        Share
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem
                      onClick={() =>
                        handleEdit(bucket?.id, bucket?.bucketName)
                      }
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      // className="text-red-600"
                      onClick={() => handleView(bucket?.id)}
                    >
                      <View className="h-4 w-4 mr-2" />
                      View
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => handleDelete(bucket?.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/*edit model*/}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Edit Bucket</h2>
            <form>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Bucket Name"
                  // className="w-full p-2 border rounded-lg"
                  value={bucketName}
                  onChange={(e) => setBucketName(e.target.value)}
                  className={`w-full p-2 border rounded-lg ${
                    errorCreated ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errorCreated && (
                  <p className="text-red-500 text-sm">{errorCreated}</p>
                )}
              </div>
              <div className="flex justify-end mt-6 space-x-4">
                <Button variant="outline" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button
                  onClick={(e) => handleSubmit(e)}
                  className="bg-purple-600 hover:bg-purple-700 flex items-center justify-center"
                  disabled={loading} // Disable button while loading
                >
                  {loading ? (
                    <span className="loader  h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
                  ) : (
                    "Edit"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/*share model*/}
      {isModalOpenShare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Password</h2>
            <form>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="*******"
                  // className="w-full p-2 border rounded-lg"
                  value={bucketPassword}
                  onChange={(e) => setBucketPassword(e.target.value)}
                  className={`w-full p-2 border rounded-lg ${
                    error ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {error && <p className="text-red-500 text-sm">{error}</p>}
              </div>
              <div className="flex justify-end mt-6 space-x-4">
                <Button variant="outline" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button
                  onClick={(e) => handleShareApi(e)}
                  className="bg-purple-600 hover:bg-purple-700 flex items-center justify-center"
                  disabled={loading} // Disable button while loading
                >
                  {loading ? (
                    <span className="loader  h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
                  ) : (
                    "Share"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
       <Toaster position="bottom-center" reverseOrder={false} />
    </div>
  );
}
