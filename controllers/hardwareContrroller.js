const Hardware = require('../models/hardwareModel');
const Category = require('../models/CategoryModel')
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});


const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 5 },
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Error: Images Only!'));
        }
    }
}).array('images', 10);

const createHardware = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }

        try {
            const { categoryName, subCategoryId, subCategory, subSubCategoryId, subSubCategory, productName, price, description } = req.body;

            const images = req.files ? req.files.map(file => `http://44.196.64.110:5000/uploads/${file.filename}`) : [];

            let categoryId;
            if (subSubCategoryId) {
                categoryId = subSubCategoryId;
            }
            else if (subCategoryId) {
                categoryId = subCategoryId;
            }
            else {
                const categoryData = await Category.findOne({ categoryName });
                if (categoryData) {
                    categoryId = categoryData._id;
                } else {
                    return res.status(404).json({
                        success: false,
                        message: "Unable to find category for the provided inputs"
                    });
                }
            }

            const newHardware = new Hardware({
                productDetails: {
                    categoryId,
                    categoryName,
                    subCategory,
                    subSubCategory,
                    productName,
                    price,
                    description,
                    images
                }
            });

            const savedHardware = await newHardware.save();

            res.status(200).json({
                status: 200,
                success: true,
                message: "Hardware created successfully",
                data: savedHardware
            });
        } catch (error) {
            res.status(500).json({
                error: error.message
            });
        }
    });
};

const getHardwareProduct = async (req, res) => {
    try {
        const hardware = await Hardware.find().select("productDetails");

        if (!hardware) {
            return res.status(404).json({
                status: 404,
                success: true,
                message: "Hardware Product Not Found",
                data: null
            })
        }

        res.status(200).json({
            status: 200,
            success: true,
            message: "Hardware Product fetched succesfully",
            data: hardware
        })

    } catch (error) {
        res.status(500).json({
            status: 500,
            success: false,
            message: " Internal server error",
            error: error.message
        })
    }
}

const getHardwarePoductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Hardware.findById(id);

        if (!product) {
            return res.status(404).json({
                status: 404,
                success: false,
                message: "Hardware Product Not Found",
                data: null
            })
        }
        res.status(200).json({
            status: 200,
            success: true,
            message: "Hardware Product fetched successfully",
            data: product
        })
    } catch (error) {
        res.status(500).json({
            status: 500,
            success: false,
            message: "internal server error",
            error: error.message
        })
    }
}

const deleteHardwareProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedProduct = await Hardware.findByIdAndDelete(id);

        res.status(200).json({
            status: 200,
            success: false,
            message: "Hardware Product deleted successfully",
            data: deletedProduct
        })

    } catch (error) {
        res.status(500).json({
            status: 500,
            success: false,
            message: "internal server error",
            error: error.message
        })
    }
}

const updateHardwareProduct = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        try {
            const { id } = req.params;

            const { categoryName, subCategory, subSubCategory, productName, price, description } = req.body;

            const existingHardwareProduct = await Hardware.findById(id);

            if (!existingHardwareProduct) {
                return res.status(404).json({
                    status: 404,
                    success: false,
                    message: "Product not found",
                    data: null
                })
            }

            let images = existingHardwareProduct.productDetails.images || [];
            if (req.files && req.files.length > 0) {
                images = req.files.map(file => `http://44.196.64.110:5000/uploads/${file.filename}`);
            }

            const updatedDetails = {
                categoryId: existingHardwareProduct.productDetails.categoryId || '' ,
                categoryName: categoryName || existingHardwareProduct.productDetails.categoryName,
                subCategory: subCategory || existingHardwareProduct.productDetails.subCategory,
                subSubCategory: subSubCategory || existingHardwareProduct.productDetails.subSubCategory,
                description: description || existingHardwareProduct.productDetails.description,
                productName: productName || existingHardwareProduct.productDetails.productName,
                price: price || existingHardwareProduct.productDetails.price,
                images,
            }

            const updatedHardwareProduct = await Hardware.findByIdAndUpdate(
                id,
                { productDetails: updatedDetails },
                { new: true }
            );

            res.status(200).json({
                status: 200,
                success: true,
                message: "Hardware Product updated successfully",
                data: updatedHardwareProduct,
            });

        } catch (error) {
            res.status(500).json({
                status: 500,
                success: false,
                message: "internal server error",
                error: error.message
            })
        }
    });
}

const addDimensions = async (req, res) => {
    try {
        const { id } = req.params;
        const dimensions = req.body;

        if (!dimensions || !dimensions.dimensions || Object.keys(dimensions.dimensions).length === 0) {
            return res.status(400).json({
                status: 404,
                success: false,
                message: "No dimensions data provided",
                data: null
            });
        }

        const dimensionsData = dimensions.dimensions;
        const formattedDimensions = {};

        Object.keys(dimensionsData).forEach((key) => {
            const dimension = dimensionsData[key];

            if (dimension.data && Array.isArray(dimension.data) && dimension.data.length > 0 && dimension.data[0].name.length > 0) {
                formattedDimensions[key] = {
                    label: dimension.label,
                    data: dimension.data.map((item) => ({
                        name: item.name,
                        cost: item.cost,
                    })),
                };
            } else {
                formattedDimensions[key] = {
                    label: null,
                    data: [],
                };
            }
        });

        if (Object.keys(formattedDimensions).length === 0) {
            return res.status(400).json({
                status: 400,
                success: false,
                message: "Invalid dimensions data (missing or empty data)",
            });
        }

        const updatedHardware = await Hardware.findByIdAndUpdate(
            id,
            { $set: { dimensions: formattedDimensions } },
            { new: true }
        );

        if (!updatedHardware) {
            return res.status(404).json({
                status: 404,
                success: false,
                message: "Hardware not found",
                data: null
            });
        }

        res.status(200).json({
            status: 200,
            success: true,
            message: "Dimensions updated successfully",
            data: updatedHardware,
        });

    } catch (error) {
        console.log("Error:", error.message);
        res.status(500).json({
            status: 500,
            success: false,
            message: error.message,
        });
    }
};

const getProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await Hardware.find({ 'productDetails.categoryId': id }).select('productDetails');

        if (!category || category.length === 0) {
            return res.status(404).json({
                status: 404,
                success: false,
                message: "Product not found",
                data: null
            })
        }

        res.status(200).json({
            status: 200,
            success: true,
            message: "Product fetched successfully",
            data: category
        })

    } catch (error) {
        res.status(500).json({
            status: 500,
            success: false,
            message: error.message
        })
    }
}

module.exports = {
    createHardware,
    getHardwareProduct,
    getHardwarePoductById,
    deleteHardwareProduct,
    updateHardwareProduct,
    addDimensions,
    getProduct
}