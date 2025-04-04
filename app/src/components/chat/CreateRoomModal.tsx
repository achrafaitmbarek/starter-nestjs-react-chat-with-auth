import React from "react";
import { useSocket } from "../../contexts/SocketContext";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";

interface CreateRoomModalProps {
    onClose: () => void;
}

interface CreateRoomFormData {
    name: string;
    description?: string;
}

const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ onClose }) => {
    const { socket, isConnected } = useSocket();
    const { register, handleSubmit, formState: { errors } } = useForm<CreateRoomFormData>();

    const onSubmit = (data: CreateRoomFormData) => {
        if (!socket || !isConnected) return;

        socket.emit('createRoom', {
            name: data.name,
            description: data.description
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }, (response: { success: boolean, room: any }) => {
            if (response.success) {
                onClose();
            }
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium">Create New Room</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Room Name
                        </label>
                        <input
                            {...register("name", {
                                required: "Room name is required",
                                minLength: { value: 3, message: "Name must be at least 3 characters" }
                            })}
                            type="text"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            placeholder="Enter room name"
                        />
                        {errors.name && (
                            <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                        )}
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description (optional)
                        </label>
                        <textarea
                            {...register("description")}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            placeholder="Enter room description"
                            rows={3}
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
                        >
                            Create Room
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateRoomModal;