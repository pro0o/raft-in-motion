function RequestBar() {
    return (
      <div className="bg-gray-100 p-4 rounded-lg shadow-md flex items-center justify-between">
        <input
          type="text"
          className="flex-grow border border-gray-300 rounded-md px-4 py-2"
          placeholder="Search or request data..."
        />
        <button className="ml-4 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
          Search
        </button>
      </div>
    );
  }
  
  export default RequestBar;
  